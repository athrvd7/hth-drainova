"""FloodGuard API: ESP32 ingestion and live flood-risk status."""

import csv
import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median

from fastapi import FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_GEO_RISK_CSV = ROOT / "viksit/nagpur_floodguard_deliverables (3)/risk_features.csv"
GEO_RISK_CSV = Path(os.getenv("FLOODGUARD_RISK_FEATURES", DEFAULT_GEO_RISK_CSV))
DEFAULT_RAINFALL_CSV = ROOT / "viksit/NEW_floodguard_real_evidence_package/historical_rainfall_nagpur.csv"
RAINFALL_CSV = Path(os.getenv("FLOODGUARD_RAINFALL_HISTORY", DEFAULT_RAINFALL_CSV))
DATABASE = Path(os.getenv("FLOODGUARD_DB", Path(__file__).parent / "floodguard.db"))
DEVICE_API_KEY = os.getenv("FLOODGUARD_DEVICE_API_KEY")
# ponytail: prototype sensor arm sits 50 cm above the drain bottom (firmware SENSOR_HEIGHT);
# upgrade path is per-device config when mounts vary.
SENSOR_RANGE_CM = 50.0
# Firmware alarm bands as a fraction of sensor range: 15/22/25 cm on a 50 cm arm.
WATER_ALARM_BANDS = ((0.50, "CRITICAL"), (0.44, "DANGER"), (0.30, "WARNING"))

app = FastAPI(title="FloodGuard API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FLOODGUARD_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReadingIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    zone_id: str = Field(min_length=1, max_length=30)
    water_level_cm: float = Field(ge=0, le=100000)
    rainfall_24h_mm: float = Field(default=0, ge=0, le=10000)
    local_status: str | None = Field(default=None, max_length=20)
    timestamp: datetime | None = None


def connection():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


def initialise_database():
    with closing(connection()) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY,
                device_id TEXT NOT NULL,
                zone_id TEXT NOT NULL,
                water_level_cm REAL NOT NULL,
                rainfall_24h_mm REAL NOT NULL,
                local_status TEXT NOT NULL DEFAULT '',
                observed_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS readings_zone_time ON readings(zone_id, observed_at DESC);
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY,
                reading_id INTEGER NOT NULL UNIQUE REFERENCES readings(id),
                zone_id TEXT NOT NULL,
                water_trend_cm_per_hour REAL NOT NULL,
                geo_risk_score INTEGER NOT NULL,
                flood_probability REAL NOT NULL,
                risk_level TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS predictions_zone_time ON predictions(zone_id, created_at DESC);
            """
        )
        # Migrate pre-existing databases: add local_status if missing
        columns = [row["name"] for row in db.execute("PRAGMA table_info(readings)")]
        if "local_status" not in columns:
            db.execute("ALTER TABLE readings ADD COLUMN local_status TEXT NOT NULL DEFAULT ''")
        db.commit()


@app.on_event("startup")
def startup():
    initialise_database()
    load_zone_risks()


def load_zone_risks() -> dict[str, dict[str, str | int]]:
    if not GEO_RISK_CSV.is_file():
        raise RuntimeError(f"FloodGuard risk features not found: {GEO_RISK_CSV}")
    with GEO_RISK_CSV.open(newline="") as file:
        risks = {
            row["zone_id"]: {
                "geo_risk_score": int(row["risk_score"]),
                "geo_risk_class": row["risk_class"],
            }
            for row in csv.DictReader(file)
        }
    if not risks:
        raise RuntimeError(f"FloodGuard risk features contain no zones: {GEO_RISK_CSV}")
    return risks


ZONE_RISKS = load_zone_risks()


def load_rainfall_history() -> dict[str, float]:
    if not RAINFALL_CSV.is_file():
        return {}
    with RAINFALL_CSV.open(newline="") as file:
        return {row["date"]: float(row["rainfall_mm"]) for row in csv.DictReader(file)}


RAINFALL_HISTORY = load_rainfall_history()


def zone_risk(zone_id: str) -> int:
    try:
        return int(ZONE_RISKS[zone_id]["geo_risk_score"])
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown zone_id: {zone_id}") from error


_LEVEL_SEVERITY = {"SAFE": 0, "WARNING": 1, "DANGER": 2, "CRITICAL": 3}


def risk_level(probability: float, water_fraction: float | None = None) -> str:
    if probability >= 0.75:
        level = "CRITICAL"
    elif probability >= 0.50:
        level = "DANGER"
    elif probability >= 0.25:
        level = "WARNING"
    else:
        level = "SAFE"
    if water_fraction is not None:
        for threshold, band in WATER_ALARM_BANDS:
            if water_fraction >= threshold and _LEVEL_SEVERITY[band] > _LEVEL_SEVERITY[level]:
                level = band
                break
    return level


def calculate_probability(water_level_cm: float, trend: float, rainfall_24h_mm: float, geo_score: int) -> float:
    # ponytail: transparent provisional calibration; replace with an event-validated model when flood labels exist.
    value = 0.35 * min(water_level_cm / SENSOR_RANGE_CM, 1) + 0.25 * min(max(trend, 0) / 20, 1)
    value += 0.20 * min(rainfall_24h_mm / 100, 1) + 0.20 * (geo_score / 100)
    return round(min(value, 1), 3)


def _trailing_24h_rainfall(observed_at: datetime) -> float:
    # ponytail: history is daily, so 24 h is today + yesterday; an hourly source is the upgrade path.
    return round(sum(RAINFALL_HISTORY.get((observed_at - timedelta(days=ago)).date().isoformat(), 0.0) for ago in (0, 1)), 2)


def _trend_cm_per_hour(points):
    # Median over consecutive rates so one ultrasonic echo spike cannot move the trend.
    rates = [(y2 - y1) / (x2 - x1) for (x1, y1), (x2, y2) in zip(points, points[1:]) if x2 > x1]
    return round(median(rates), 2) if rates else 0.0


def prediction_response(row: sqlite3.Row) -> dict:
    return dict(row)


# ---------------------------------------------------------------------------
# Map data: Nagpur zone polygons (with elevation), district boundary, hotspots
# ---------------------------------------------------------------------------

_MAP_ZONES_CANDIDATES = [
    ROOT / "viksit/nagpur_floodguard_deliverables (3)/risk_scores.geojson",
    ROOT / "viksit/NEW_floodguard_real_evidence_package/risk_scores.geojson",
]
# City boundary first: zones are clipped into the Nagpur city shape.
_MAP_BOUNDARY_CANDIDATES = [
    ROOT / "viksit/NEW_floodguard_real_evidence_package/nagpur_city_boundary.geojson",
    ROOT / "viksit/NEW_floodguard_real_evidence_package/nagpur_boundary.geojson",
    ROOT / "viksit/nagpur_floodguard_deliverables (3)/nagpur_boundary.geojson",
]
_MAP_HOTSPOTS_CANDIDATES = [
    ROOT / "viksit/NEW_floodguard_real_evidence_package/flood_hotspots.geojson",
]
_MAP_WATERWAYS_CANDIDATES = [
    ROOT / "viksit/NEW_floodguard_real_evidence_package/waterways.geojson",
]

_map_cache: dict | None = None
# Inset degree to provide clean breathing room between adjacent risk blocks
_MAP_CELL_INSET_DEG = 0.00035


def _first_existing(paths: list[Path]) -> Path | None:
    return next((p for p in paths if p.is_file()), None)


def _trim_feature(feature: dict, keys: list[str]) -> dict:
    props = feature.get("properties", {}) or {}
    return {
        "type": "Feature",
        "properties": {k: props.get(k) for k in keys},
        "geometry": feature.get("geometry"),
    }


def _clip_zones_to_city(zones: list[dict], city_geometry: dict) -> list[dict]:
    """Cleanly clip zone cells to city boundary without overlapping or displaced blocks."""
    try:
        from shapely.geometry import shape, mapping
    except ImportError:
        return zones

    city_shape = shape(city_geometry)
    clipped: list[dict] = []
    for feature in zones:
        zone_shape = shape(feature["geometry"])
        result = zone_shape.intersection(city_shape)
        if result.is_empty:
            continue
        if result.geom_type == "MultiPolygon":
            result = max(result.geoms, key=lambda p: p.area)
        if result.geom_type != "Polygon" or result.area < 1e-6:
            continue
        # Clean inset so blocks stay clearly separated and not an overwhelming solid slab
        inset = result.buffer(-_MAP_CELL_INSET_DEG)
        if not inset.is_empty and inset.geom_type == "Polygon" and inset.area > 1e-6:
            result = inset
        clipped.append({**feature, "geometry": mapping(result)})
    return clipped


def load_map_data() -> dict:
    data: dict = {"zones": None, "boundary": None, "hotspots": None, "waterways": None}

    zones_path = _first_existing(_MAP_ZONES_CANDIDATES)
    if zones_path is not None:
        gj = json.loads(zones_path.read_text())
        data["zones"] = {
            "type": "FeatureCollection",
            "features": [
                _trim_feature(f, ["zone_id", "risk_score", "risk_class", "elevation_m"])
                for f in gj.get("features", [])
            ],
        }

    boundary_path = _first_existing(_MAP_BOUNDARY_CANDIDATES)
    if boundary_path is not None:
        gj = json.loads(boundary_path.read_text())
        features = gj.get("features", [])
        if features:
            data["boundary"] = {
                "type": "Feature",
                "properties": {"name": (features[0].get("properties") or {}).get("name", "Nagpur")},
                "geometry": features[0].get("geometry"),
            }
            # Carve the zone grid into the genuine Nagpur city boundary
            if data["zones"] is not None:
                data["zones"]["features"] = _clip_zones_to_city(data["zones"]["features"], features[0]["geometry"])

    hotspots_path = _first_existing(_MAP_HOTSPOTS_CANDIDATES)
    if hotspots_path is not None:
        gj = json.loads(hotspots_path.read_text())
        data["hotspots"] = {
            "type": "FeatureCollection",
            "features": [
                _trim_feature(f, ["name", "event_year", "evidence"])
                for f in gj.get("features", [])
            ],
        }

    waterways_path = _first_existing(_MAP_WATERWAYS_CANDIDATES)
    if waterways_path is not None:
        try:
            gj = json.loads(waterways_path.read_text())
            water_features = []
            for f in gj.get("features", []):
                name = (f.get("properties") or {}).get("name")
                if not name:
                    continue
                geom = f.get("geometry") or {}
                # Keep named lakes and rivers within Nagpur bounds
                if geom.get("type") in ("Polygon", "MultiPolygon", "LineString"):
                    coords = geom.get("coordinates", [])
                    # Quick bounding check
                    sample = coords[0][0] if geom.get("type") == "Polygon" and coords and coords[0] else (coords[0] if geom.get("type") == "LineString" and coords else None)
                    if sample and isinstance(sample, (list, tuple)) and len(sample) >= 2:
                        lon, lat = sample[0], sample[1]
                        if 78.95 <= lon <= 79.22 and 21.02 <= lat <= 21.26:
                            water_features.append({
                                "type": "Feature",
                                "properties": {"name": name, "natural": (f.get("properties") or {}).get("natural", "water")},
                                "geometry": geom,
                            })
            if water_features:
                data["waterways"] = {"type": "FeatureCollection", "features": water_features[:40]}
        except Exception:
            pass

    return data


@app.get("/api/map")
def map_data():
    global _map_cache
    if _map_cache is None:
        _map_cache = load_map_data()
    if not _map_cache["zones"]:
        raise HTTPException(status_code=404, detail="Map zone polygons not found on server")
    return _map_cache


@app.get("/health")
def health():
    return {"status": "ok", "zones_loaded": len(ZONE_RISKS)}


@app.get("/api/zones")
def zones():
    return [{"zone_id": zone_id, **risk} for zone_id, risk in ZONE_RISKS.items()]


@app.post("/api/readings", status_code=status.HTTP_201_CREATED)
def ingest_reading(reading: ReadingIn, x_device_key: str | None = Header(default=None)):
    if DEVICE_API_KEY and x_device_key != DEVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid device key")
    geo_score = zone_risk(reading.zone_id)
    observed_at_utc = (reading.timestamp or datetime.now(timezone.utc)).astimezone(timezone.utc)
    observed_at = observed_at_utc.isoformat()
    rainfall = reading.rainfall_24h_mm if reading.rainfall_24h_mm > 0 else _trailing_24h_rainfall(observed_at_utc)

    with closing(connection()) as db:
        cursor = db.execute(
            "INSERT INTO readings(device_id, zone_id, water_level_cm, rainfall_24h_mm, local_status, observed_at) VALUES (?, ?, ?, ?, ?, ?)",
            (reading.device_id, reading.zone_id, reading.water_level_cm, rainfall, reading.local_status or "", observed_at),
        )
        rows = list(reversed(db.execute(
            "SELECT water_level_cm, observed_at FROM readings WHERE zone_id = ? ORDER BY observed_at DESC LIMIT 10",
            (reading.zone_id,),
        ).fetchall()))
        oldest = datetime.fromisoformat(rows[0]["observed_at"])
        points = [
            ((datetime.fromisoformat(row["observed_at"]) - oldest).total_seconds() / 3600, row["water_level_cm"])
            for row in rows
        ]
        trend = _trend_cm_per_hour(points)
        probability = calculate_probability(reading.water_level_cm, trend, rainfall, geo_score)
        created_at = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO predictions(reading_id, zone_id, water_trend_cm_per_hour, geo_risk_score, flood_probability, risk_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (cursor.lastrowid, reading.zone_id, trend, geo_score, probability, risk_level(probability, min(reading.water_level_cm / SENSOR_RANGE_CM, 1)), created_at),
        )
        db.commit()
        row = db.execute(
            """SELECT r.device_id, r.zone_id, r.water_level_cm, r.rainfall_24h_mm, r.local_status, r.observed_at,
                      p.water_trend_cm_per_hour, p.geo_risk_score, p.flood_probability, p.risk_level
               FROM predictions p JOIN readings r ON r.id = p.reading_id WHERE p.reading_id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return prediction_response(row)


@app.get("/api/zones/{zone_id}/latest")
def latest_prediction(zone_id: str):
    zone_risk(zone_id)
    with closing(connection()) as db:
        row = db.execute(
            """SELECT r.device_id, r.zone_id, r.water_level_cm, r.rainfall_24h_mm, r.local_status, r.observed_at,
                      p.water_trend_cm_per_hour, p.geo_risk_score, p.flood_probability, p.risk_level
               FROM predictions p JOIN readings r ON r.id = p.reading_id
               WHERE p.zone_id = ? ORDER BY p.created_at DESC LIMIT 1""",
            (zone_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"No readings for zone_id: {zone_id}")
    return prediction_response(row)


@app.get("/api/zones/{zone_id}/history")
def prediction_history(zone_id: str, limit: int = Query(default=50, ge=1, le=500)):
    zone_risk(zone_id)
    with closing(connection()) as db:
        rows = db.execute(
            """SELECT r.device_id, r.zone_id, r.water_level_cm, r.rainfall_24h_mm, r.local_status, r.observed_at,
                      p.water_trend_cm_per_hour, p.geo_risk_score, p.flood_probability, p.risk_level
               FROM predictions p JOIN readings r ON r.id = p.reading_id
               WHERE p.zone_id = ? ORDER BY p.created_at DESC LIMIT ?""",
            (zone_id, limit),
        ).fetchall()
    return [prediction_response(row) for row in rows]
