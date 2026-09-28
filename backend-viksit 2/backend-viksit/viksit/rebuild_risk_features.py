"""Rebuild risk_features.csv and risk_scores.geojson with nearest-pixel rainfall
and evidence-backed historical events, using the checked-in risk_model.score."""

import json
import sys
from pathlib import Path

import pandas as pd
from shapely.geometry import shape, Point

VIKSIT = Path(__file__).resolve().parent
DELIV = VIKSIT / "nagpur_floodguard_deliverables (3)"
EVIDENCE = VIKSIT / "NEW_floodguard_real_evidence_package"

# Zone polygons: NEW_floodguard_real_evidence_package/risk_zones.geojson turned out to be
# 20 evidence POINTS (RZ-001..), not the 438 zone polygons; the polygons of record are the
# geometries already shipped in risk_scores.geojson, so they are the join target here.
ZONE_GEO = DELIV / "risk_scores.geojson"
RAINFALL_CSV = DELIV / "clean_rainfall.csv"
HOTSPOTS_GEO = EVIDENCE / "flood_hotspots.geojson"
FEATURES_CSV = DELIV / "risk_features.csv"

sys.path.insert(0, str(DELIV))
from risk_model import score  # noqa: E402


def _native(value):
    return value.item() if hasattr(value, "item") else value


def load_zones():
    gj = json.loads(ZONE_GEO.read_text())
    zones = {f["properties"]["zone_id"]: shape(f["geometry"]) for f in gj["features"]}
    old_scores = {f["properties"]["zone_id"]: f["properties"].get("risk_score") for f in gj["features"]}
    current = pd.read_csv(FEATURES_CSV)
    if len(zones) != 438:
        sys.exit(f"ABORT: expected 438 zone polygons, got {len(zones)} in {ZONE_GEO}")
    if set(zones) != set(current.zone_id):
        sys.exit("ABORT: zone_ids in geojson do not match risk_features.csv")
    return gj, zones, old_scores, current


def pixel_stats():
    rf = pd.read_csv(RAINFALL_CSV)
    rf["date"] = pd.to_datetime(rf["date"])
    rf = rf.sort_values(["latitude", "longitude", "date"])
    rf["rolling_3day"] = rf.groupby(["latitude", "longitude"]).rainfall_mm.transform(
        lambda v: v.rolling(3, min_periods=1).sum()
    )
    return rf.groupby(["latitude", "longitude"]).agg(
        rainfall_mm=("rainfall_mm", "sum"),
        max_daily_rainfall_mm=("rainfall_mm", "max"),
        max_3day_rainfall_mm=("rolling_3day", "max"),
    )


def assign_nearest_pixel(zones, pixels):
    # ponytail: brute-force lon/lat Euclidean nearest-pixel per centroid over ~30 pixels;
    # upgrade path is a projected KD-tree if the pixel grid ever grows past city scale.
    lat = pixels.index.get_level_values("latitude").to_numpy()
    lon = pixels.index.get_level_values("longitude").to_numpy()
    rows = []
    for zone_id, poly in zones.items():
        c = poly.centroid
        i = ((lat - c.y) ** 2 + (lon - c.x) ** 2).argmin()
        rows.append((zone_id, *pixels.iloc[i]))
    return pd.DataFrame(rows, columns=["zone_id", *pixels.columns]).set_index("zone_id")


def count_hotspots(zones):
    hot = json.loads(HOTSPOTS_GEO.read_text())["features"]
    outside = []
    counts = dict.fromkeys(zones, 0)
    for f in hot:
        p = Point(*f["geometry"]["coordinates"])
        # ponytail: brute-force 38x438 point-in-polygon; use an STRtree if hotspots
        # ever reach thousands.
        hits = [z for z, poly in zones.items() if poly.covers(p)]
        for z in hits:
            counts[z] += 1
        if not hits:
            outside.append(f["properties"].get("name"))
    return pd.Series(counts, name="historical_event_count"), outside


def main():
    gj, zones, old_scores, current = load_zones()
    pixels = pixel_stats()
    nearest = assign_nearest_pixel(zones, pixels)
    hotspot_counts, outside = count_hotspots(zones)
    print(f"Hotspot points outside every zone polygon: {len(outside)} of 38"
          f"{'' if not outside else ' -> ' + ', '.join(map(str, outside))}")

    inputs = current[["zone_id", "elevation_m", "slope_deg"]].copy()
    inputs = inputs.join(nearest, on="zone_id")
    inputs["historical_event_count"] = inputs.zone_id.map(hotspot_counts)
    inputs["historical_data_available"] = "true"

    scored = score(inputs)

    columns = list(current.columns)
    if "historical_contribution" not in columns:
        columns.insert(columns.index("risk_score"), "historical_contribution")
    scored = scored.sort_values("zone_id")[columns]
    scored.to_csv(FEATURES_CSV, index=False)

    by_zone = scored.set_index("zone_id")
    for f in gj["features"]:
        zid = f["properties"]["zone_id"]
        f["properties"] = {"zone_id": zid, **{c: _native(by_zone.at[zid, c]) for c in columns if c != "zone_id"}}
    ZONE_GEO.write_text(json.dumps(gj))
    print(f"\nWrote {FEATURES_CSV} ({len(scored)} rows) and {ZONE_GEO} "
          f"({len(gj['features'])} features)")

    assert len(scored) == 438
    assert len(json.loads(ZONE_GEO.read_text())["features"]) == 438

    dry = ((scored.rainfall_mm == 0) & (scored.max_daily_rainfall_mm == 0)
           & (scored.max_3day_rainfall_mm == 0))
    assert not dry.any() or bool((pixels.rainfall_mm == 0).all()), \
        f"{dry.sum()} zones still have all-zero rainfall"
    assert scored.historical_data_available.astype(str).str.lower().eq("true").all()
    assert "historical_contribution" in scored.columns and (scored.historical_factor > 0).any(), \
        "historical factor is not active"
    assert scored.set_index("zone_id")[["elevation_m", "slope_deg"]].sort_index().equals(
        current.set_index("zone_id")[["elevation_m", "slope_deg"]].sort_index()), \
        "elevation/slope drifted from the current CSV"

    order = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    hotspot_zones = scored[scored.historical_event_count > 0]
    print("\nAll-zone class distribution:")
    print(scored.risk_class.value_counts().reindex(order, fill_value=0).to_string())
    print(f"\nHotspot-zone class distribution ({len(hotspot_zones)} zones):")
    print(hotspot_zones.risk_class.value_counts().reindex(order, fill_value=0).to_string())
    high_share = hotspot_zones.risk_class.isin(["HIGH", "CRITICAL"]).mean()
    print(f"\nHotspot zones HIGH or CRITICAL: {high_share:.1%}")
    assert high_share > 0.5, (
        f"only {high_share:.1%} of hotspot-containing zones are HIGH/CRITICAL - "
        "decision gate on whether zone-level rainfall keeps its weight"
    )

    # Old scores come from the geojson properties captured before this run overwrote them.
    merged = scored[["zone_id", "risk_score", "risk_class"]].assign(risk_score_old=scored.zone_id.map(old_scores))
    merged["delta"] = merged.risk_score - merged.risk_score_old
    print("\nTop 10 zones by new score:")
    print(scored.nlargest(10, "risk_score")[["zone_id", "risk_score", "risk_class"]]
          .to_string(index=False))
    print(f"\nOld->new delta: min={merged.delta.min()} median={merged.delta.median()} "
          f"max={merged.delta.max()}")
    print("\nZ001..Z004 old->new:")
    print(merged[merged.zone_id.isin(["Z001", "Z002", "Z003", "Z004"])]
          [["zone_id", "risk_score_old", "risk_score", "risk_class"]]
          .to_string(index=False))


if __name__ == "__main__":
    main()
