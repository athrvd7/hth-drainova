# FloodGuard — Project Information

**FloodGuard** is an IoT flood early-warning system for Nagpur. An ESP32 microcontroller measures drainage water levels with an ultrasonic sensor and posts readings to a Python backend. A React dashboard shows live telemetry, risk predictions, and an interactive flood-risk map of the city.

---

## Project Layout

```
atharva backend/
├── information.md                    ← this file
├── start_frontend.bat                ← Windows launcher: npm run dev
├── backend-viksit 2/
│   ├── backend-viksit/
│   │   ├── backend/                  ← FastAPI server + SQLite database
│   │   └── viksit/                   ← ML risk engine, datasets, GeoJSON data
│   └── esp32_firmware/
│       └── floodguard_esp32/         ← Arduino firmware for ESP32
└── frontend/                         ← React + Vite dashboard
    └── src/
        ├── api/                      ← HTTP client
        ├── components/               ← UI components
        └── utils/                    ← Browser audio/notification helpers
```

---

## 1. Backend — `backend-viksit 2/backend-viksit/backend/`

### `app.py`
The entire backend in one file (~354 lines). Built with **FastAPI** + **SQLite**.

**Key responsibilities:**
- Loads `risk_features.csv` at startup into memory (`ZONE_RISKS`) — a lookup of geo-risk score per zone.
- Initialises (and migrates) the SQLite database with two tables: `readings` and `predictions`.
- **POST `/api/readings`** — Ingests a sensor payload from the ESP32 (or simulator). Computes `water_trend_cm_per_hour` by diffing against the previous reading, then runs `calculate_probability()` to score flood risk and stores both the raw reading and the prediction in one transaction.
- **GET `/api/zones/{zone_id}/latest`** — Latest risk prediction for a zone.
- **GET `/api/zones/{zone_id}/history`** — Up to 500 historical readings for a zone.
- **GET `/api/map`** — Returns GeoJSON for zone polygons (clipped to Nagpur city boundary), the city boundary, flood hotspots, and named waterways. Result is cached in memory after first load.
- **GET `/api/zones`** — All zone IDs with their geo-risk score and class.
- **GET `/health`** — Liveness probe.

**Risk probability formula (`calculate_probability`):**
```
P = 0.35 × (water_level / 200)
  + 0.25 × (rising_trend / 20)
  + 0.20 × (rainfall_24h / 100)
  + 0.20 × (geo_score / 100)
```
Maps to `SAFE / WARNING / DANGER / CRITICAL` at 0.25 / 0.50 / 0.75 thresholds.

**Environment variables:**

| Variable | Default | Purpose |
|---|---|---|
| `FLOODGUARD_RISK_FEATURES` | `viksit/.../risk_features.csv` | Path to geo-risk CSV |
| `FLOODGUARD_DB` | `backend/floodguard.db` | SQLite database path |
| `FLOODGUARD_DEVICE_API_KEY` | _(none)_ | Optional ESP32 auth key |
| `FLOODGUARD_CORS_ORIGINS` | `*` | Allowed CORS origins |

**Dependencies:** `fastapi`, `uvicorn[standard]`, `shapely` (for polygon clipping).

---

### `serial_bridge.py`
A standalone Python script (~101 lines). Reads the ESP32 serial output over USB and posts parsed readings to the local backend. Use this as a fallback when the ESP32's Wi-Fi is unavailable.

- Auto-detects the COM port by checking for CH340/CP210 USB-UART adapters.
- Parses the serial line with regex: `Level: <n> cm` and optionally `Status: <WORD>`.
- Posts to `http://127.0.0.1:8000/api/readings` with `device_id = "esp32-usb-01"`, `zone_id = "Z001"`.

---

### `floodguard.db`
SQLite database file (~316 KB). Contains all ingested `readings` and computed `predictions`. Auto-created and migrated by `app.py` on startup.

---

### `requirements.txt`
```
fastapi>=0.115,<1
uvicorn[standard]>=0.30,<1
shapely>=2,<3
```

---

### `test_app.py`
Basic smoke test for the API.

### `start_backend.bat`
Windows convenience script — activates `.venv` and starts `uvicorn app:app --reload`.

### Setup docs
- `README.md` — Quick start.
- `setup.md` — Full environment setup.
- `ESP32_CONNECTION_GUIDE.md` — Hardware wiring and firmware flash guide.

---

## 2. Risk Engine / ML — `backend-viksit 2/backend-viksit/viksit/`

This folder holds the data science work that produces the geo-risk scores consumed by `app.py`.

### `nagpur_floodguard_risk_engine.ipynb`
Jupyter notebook. Ingests rainfall CSV + DEM elevation raster and produces:
- `risk_features.csv` — zone-level weighted risk score table (zone_id, risk_score, risk_class).
- `risk_scores.geojson` — same data as polygons for the map.

### `datasets/`

| File | Description |
|---|---|
| `nagpur_chirps_daily_2024.csv` | Daily CHIRPS rainfall data for Nagpur, 2024 |
| `nagpur_terrain_dem.tif` | SRTM Digital Elevation Model raster (GeoTIFF) |
| `README.md` | Dataset provenance notes |

### `nagpur_floodguard_deliverables (3)/`
Output deliverables from the risk engine notebook:
- `risk_features.csv` — **primary input** consumed by `app.py` on startup.
- `risk_scores.geojson` — zone polygons with risk scores for the map layer.
- `nagpur_boundary.geojson` — Nagpur city administrative boundary.

### `NEW_floodguard_real_evidence_package/`
Richer GeoJSON evidence package:
- `nagpur_city_boundary.geojson` — Preferred city boundary (used first by `app.py`).
- `flood_hotspots.geojson` — Historical flood event points (name, year, evidence).
- `waterways.geojson` — Named rivers and lakes within Nagpur bounds.
- `risk_scores.geojson` — Alternate zone polygons.

### `info.md`
Task brief for the risk-engine developer: data sources (CHIRPS rainfall, SRTM DEM, India Flood Inventory), scoring bands (0–30 LOW, 31–55 MODERATE, 56–75 HIGH, 76–100 CRITICAL), and expected deliverables.

---

## 3. ESP32 Firmware — `esp32_firmware/floodguard_esp32/`

### `floodguard_esp32.ino`
Arduino sketch (~940 lines) for an ESP32 with an **HC-SR04 / JSN-SR04T** ultrasonic sensor.

**Hardware wiring:**
```
HC-SR04 TRIG → GPIO 5
HC-SR04 ECHO → GPIO 18
```

**Runtime behaviour:**

| Interval | Action |
|---|---|
| Every 1 s | Read ultrasonic distance → compute water level |
| Every 3 s | HTTP POST to backend `/api/readings` |
| Every 5 s | Print status summary to USB serial (115200 baud) |
| Every 10 s | Retry Wi-Fi connection if dropped |

**Water level thresholds (configurable constants):**

| Level | Threshold |
|---|---|
| WARNING | 15 cm |
| DANGER | 22 cm |
| CRITICAL | 25 cm |

Also serves a minimal web dashboard on **port 80** (the ESP32's own IP) for at-a-glance sensor status without needing the full React frontend.

**Calibration constants to update before flashing:**
- `SENSOR_HEIGHT` — distance from sensor face to drainage bottom (default 50 cm).
- `ssid` / `password` — Wi-Fi credentials.
- `backendUrl` — your laptop's LAN IP, e.g. `http://10.73.209.16:8000/api/readings`.

---

## 4. Frontend — `frontend/`

Built with **React 19 + Vite 8**. Communicates with the backend via the Vite dev-proxy (or a configured IP in localStorage).

### `src/main.jsx`
React entry point. Mounts `<App />` into `#root`.

### `src/App.jsx`
Root component. Owns all shared state and the main data-fetch loop.

**State managed here:**
- `backendOnline` / `zones` / `selectedZone` — backend health and zone list.
- `latestReading` / `history` — telemetry for the selected zone, polled every `refreshInterval` ms (default 2 s).
- `activeTab` — `'live'` | `'map'` | `'zones'`.
- `theme` — `'dark'` | `'light'`, persisted to `localStorage`.
- Modal visibility: `showConnectModal`, `showSimulatorModal`, `showSettingsModal`.
- `alertPopupData` / `isSirenMuted` — drives the critical alert overlay and audio siren.

**Critical alert logic:** When `risk_level === 'CRITICAL'`, starts the Web Audio siren, shows `CriticalAlertPopup`, and fires a browser push notification (once per transition). When risk drops below CRITICAL, everything stops immediately.

---

### `src/api/client.js`
All backend HTTP calls in one file. Exports:
- `getBaseUrl()` / `setBaseUrl()` — reads/writes `floodguard_api_url` from localStorage; falls back to `''` (Vite proxy).
- `fetchHealth()`, `fetchZones()`, `fetchLatestReading(zoneId)`, `fetchReadingHistory(zoneId, limit)`, `fetchMap()`, `postSensorReading(payload)`.

---

### `src/utils/buzzer.js`
Web Audio API emergency siren. Pre-warms `AudioContext` on the first user gesture to avoid browser autoplay blocks.

- `startContinuousBuzzer()` — plays 4-pulse rounds of alternating 980 Hz / 1260 Hz square waves every 750 ms until stopped.
- `stopContinuousBuzzer()` — kills all active oscillator nodes immediately.
- `setBuzzerMuted(bool)` — silences audio without clearing `isSirenActive`, so UI shows "muted critical" state.
- `isBuzzerActive()` — returns true if siren is running and unmuted.

### `src/utils/notifications.js`
Browser Notification API + haptic vibration wrapper.

- `getNotificationPermission()` / `requestNotificationPermission()` — permission lifecycle.
- `sendCriticalPushNotification(zoneId, {waterLevel, trend, probability})` — fires a native OS notification titled "🚨 CRITICAL FLOOD ALERT" with `requireInteraction: true`, plus a haptic vibration pattern on mobile.

---

### `src/components/`

| Component | Description |
|---|---|
| `Navbar.jsx` | Top bar: zone selector, backend status pill, tab switcher (Live / Map / Zones), theme toggle, refresh button, notification bell, modal launchers. |
| `HeroTelemetry.jsx` | Large hero widget showing current water level, flood probability, risk badge, trend indicator, and geo-risk score for the selected zone. |
| `TelemetryCharts.jsx` | Recharts line/area charts of water level and flood probability over the last 50 readings. |
| `ReadingsTable.jsx` | Paginated table of raw ingestion records with risk-level colour coding. |
| `NagpurMap.jsx` | 2D SVG map using GeoJSON from `/api/map`. Renders zone risk polygons, city boundary, flood hotspots, and waterways. **Lazy-loaded** — Three.js bundle is not fetched until the Map tab is first opened. |
| `NagpurMap3D.jsx` | Experimental Three.js 3D elevation map (zone blocks extruded by risk score / elevation). |
| `MapCompass.jsx` | Decorative compass rose overlay for the map view. |
| `ZoneExplorer.jsx` | Searchable/filterable grid of all zones with risk class badges. Clicking a zone switches to the Live tab for that zone. |
| `CriticalAlertPopup.jsx` | Full-screen overlay on CRITICAL risk. Shows water level, trend, probability, zone ID, and a mute/unmute button for the siren. |
| `DeviceConnectModal.jsx` | Modal to change the backend server URL stored in localStorage. |
| `SimulatorModal.jsx` | Form to manually POST a fake sensor reading (water level, rainfall, local status) for testing without hardware. |
| `SettingsModal.jsx` | Adjust the polling refresh interval (default 2 s). |

---

### `src/index.css` / `src/App.css`
Global design system — CSS custom properties for the dark/light theme (`--bg-primary`, `--text-muted`, `--border-subtle`, etc.), glass-card styles, and component layout tokens.

---

## 5. Data Flow

```
HC-SR04 Sensor
      │  distance measurement (every 1 s)
      ▼
ESP32 (floodguard_esp32.ino)
      │  HTTP POST /api/readings  (every 3 s, over Wi-Fi)
      │  OR
      │  USB Serial → serial_bridge.py → HTTP POST /api/readings
      ▼
FastAPI Backend (app.py)
      │  stores in SQLite (readings + predictions tables)
      │  computes flood probability + risk level
      ▼
React Frontend (App.jsx polling every 2 s)
      ├─ GET /api/zones/{zone_id}/latest  → HeroTelemetry, CriticalAlertPopup
      ├─ GET /api/zones/{zone_id}/history → TelemetryCharts, ReadingsTable
      └─ GET /api/map                     → NagpurMap (on map tab)
```

---

## 6. Quick Start

### Backend
```bash
cd "backend-viksit 2/backend-viksit/backend"
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # opens http://localhost:5173
```

### USB Serial Bridge (optional fallback — no ESP32 Wi-Fi needed)
```bash
pip install pyserial requests
python serial_bridge.py
```

### ESP32 Firmware
Flash `floodguard_esp32.ino` via Arduino IDE.  
Update `ssid`, `password`, and `backendUrl` (your laptop's LAN IP) before flashing.

---

## 7. ML Risk Engine — Deep Dive

> This section covers everything a judge, reviewer, or technical evaluator might ask about the machine-learning / data-science component of FloodGuard.

---

### 7.1 What kind of model is this?

FloodGuard uses an **Explainable Weighted Risk Scoring model** — also called a **Flood Susceptibility Index (FSI)** in the academic literature. It is **not** a black-box ML classifier.

This was a deliberate design choice: Nagpur has no labelled historical flood-event dataset large enough to train a supervised classifier reliably. Forcing deep learning on sparse, unverified data would produce uninterpretable outputs with false confidence. Instead, the model is transparent — every factor, every weight, every intermediate number is readable in `risk_features.csv`.

**Model type:** Multi-criteria weighted sum with percentile normalisation  
**Interpretability:** Full — every score can be traced to its factor contributions  
**Validated against:** 2024 CHIRPS rainfall data + SRTM elevation DEM + optional verified flood event points

---

### 7.2 Features (Input Variables)

| Feature | Source | Role in model |
|---|---|---|
| `max_daily_rainfall_mm` | CHIRPS v2 daily precipitation (2024) | Peak 1-day rainfall in a zone — proxy for flash-flood trigger |
| `max_3day_rainfall_mm` | Computed via 3-day rolling window on CHIRPS | Saturation indicator — sustained rain that overwhelms drainage |
| `elevation_m` | SRTM DEM via Mapzen Terrain Tiles (EPSG:4326) | Low elevation → water accumulates; sampled at each zone centroid |
| `slope_deg` | Computed from DEM using NumPy gradient + `arctan(hypot(gx, gy))` | Low slope → slow drainage, water pools |
| `historical_event_count` | India Flood Inventory / IFI-Impacts (when supplied) | Spatial count of verified past flood events in each zone |

**Why these five?** They cover the three physical mechanisms of urban flooding:
1. **Rainfall intensity** — how much and how fast water enters the system.
2. **Terrain** — where water naturally flows and pools.
3. **Historical evidence** — where flooding has actually occurred (ground truth, when available).

---

### 7.3 Feature Engineering

**Rainfall features — rolling window aggregation:**
```python
daily['rolling_3day_mm'] = daily.groupby('zone_id').rainfall_mm.transform(
    lambda v: v.rolling(3, min_periods=1).sum()
)
max_daily = daily.groupby('zone_id').rainfall_mm.max()
max_3day  = daily.groupby('zone_id').rolling_3day_mm.max()
```
Two separate rainfall signals are extracted per zone: the single worst day (`max_daily_rainfall_mm`) and the worst 3-day accumulation (`max_3day_rainfall_mm`). The 3-day window captures soil saturation and drainage overload, not just momentary intensity.

**Elevation & slope — DEM gradient computation:**
```python
gy, gx = np.gradient(data, y_res_metres, x_res_metres)
slope   = np.degrees(np.arctan(np.hypot(gx, gy)))
```
`np.gradient` computes central-difference derivatives of the raster. `arctan(hypot(...))` converts the magnitude of the gradient vector to degrees. Each zone's value is sampled at its centroid pixel.

**Historical events — spatial join:**
```python
event_gdf = gpd.GeoDataFrame(events, geometry=gpd.points_from_xy(...), crs=4326).to_crs(32644)
counts = gpd.sjoin(event_gdf, zones[['zone_id','geometry']], predicate='within').groupby('zone_id').size()
```
GeoPandas spatial join assigns each point-event record to the 1 km grid cell that contains it, giving an `historical_event_count` per zone.

---

### 7.4 Normalisation Method — Percentile Ranking

All features are normalised using **percentile rank** (`pandas.Series.rank(pct=True)`):

```python
def _percentile(series, ascending=True):
    return series.rank(pct=True, ascending=ascending).fillna(0.5)
```

| Feature | `ascending` | Meaning |
|---|---|---|
| `max_daily_rainfall_mm` | `True` | Higher rainfall → higher factor |
| `max_3day_rainfall_mm` | `True` | Higher 3-day total → higher factor |
| `elevation_m` | `False` | **Lower** elevation → higher factor (low = more risk) |
| `slope_deg` | `False` | **Lower** slope → higher factor (flat = more risk) |

**Why percentile rank, not min-max scaling?**
- Robust to outliers (one anomalous spike doesn't compress all other values)
- Results are always in [0, 1] regardless of input magnitude or units
- Scores are relative within the study area, which is honest — the model scores zones against each other, not against an absolute flood threshold

---

### 7.5 Scoring Formula

**Without historical event data (current production state):**
```
risk_score = 100 × (
    0.25 × max_daily_rainfall_factor
  + 0.25 × max_3day_rainfall_factor
  + 0.30 × low_elevation_factor
  + 0.20 × low_slope_factor
)
```

**With verified historical event data (optional, if supplied):**  
A 5th factor is added and all weights are rescaled to sum to 1:
```
risk_score = 100 × (
    0.25 × max_daily_rainfall_factor   (÷ 1.2)
  + 0.25 × max_3day_rainfall_factor    (÷ 1.2)
  + 0.30 × low_elevation_factor        (÷ 1.2)
  + 0.20 × low_slope_factor            (÷ 1.2)
  + 0.20 × historical_factor
)
```

**Rationale for weights:**
- Elevation carries the highest single weight (0.30) because terrain is the dominant long-run determinant of where water accumulates in urban areas.
- The two rainfall signals share equal weight (0.25 each) to capture both flash events and saturation.
- Slope is lower (0.20) because Nagpur's terrain is relatively flat citywide; slope discrimination is still useful at the 1 km zone level.

---

### 7.6 Risk Classification

Scores are binned with `pandas.cut`:

```python
pd.cut(risk_score, [-1, 30, 55, 75, 100], labels=['LOW','MODERATE','HIGH','CRITICAL'])
```

| Class | Score range | Interpretation |
|---|---|---|
| LOW | 0 – 30 | Minimal susceptibility; well-drained high ground |
| MODERATE | 31 – 55 | Some susceptibility; monitor during heavy rainfall |
| HIGH | 56 – 75 | Elevated risk; pre-position resources |
| CRITICAL | 76 – 100 | Highest susceptibility; immediate response protocols |

**Current distribution across Nagpur (438 zones):**

| Class | Zones | Share |
|---|---|---|
| LOW | 26 | 6% |
| MODERATE | 262 | 60% |
| HIGH | 142 | 32% |
| CRITICAL | 8 | 2% |

Score range in the dataset: **25 – 92**.

---

### 7.7 Real-Time Risk Extension (in `app.py`)

The static geo-risk score from the notebook is the **baseline**. The backend extends it with **real-time sensor telemetry** every time the ESP32 posts a reading:

```python
def calculate_probability(water_level_cm, trend, rainfall_24h_mm, geo_score):
    P = 0.35 × min(water_level_cm / 200, 1)   # current sensor reading
      + 0.25 × min(max(trend, 0) / 20, 1)      # rate of water rise (cm/h)
      + 0.20 × min(rainfall_24h_mm / 100, 1)   # recent rainfall from sensor payload
      + 0.20 × (geo_score / 100)               # static geo susceptibility from notebook
    return round(min(P, 1), 3)
```

This makes the final flood probability a **fusion of static spatial risk + live IoT sensor data** — the classic sensor-fusion pattern used in real disaster management systems. The geo-risk score acts as a prior; the live water level and trend update it in real time.

**Trend calculation:**
```python
elapsed_hours = (current_timestamp - previous_timestamp).total_seconds() / 3600
trend = (current_water_level - previous_water_level) / elapsed_hours  # cm/h
```
A rising trend at 20 cm/h or more saturates the trend contribution at 1.0 (maximum alarm).

---

### 7.8 Data Sources & Provenance

| Dataset | Source | Period | Format |
|---|---|---|---|
| Rainfall | CHIRPS v2 (Climate Hazards Group InfraRed Precipitation with Station data) — UC Santa Barbara | 2024-01-01 to 2024-12-31 | Daily CSV (date, rainfall_mm) |
| DEM (elevation) | Mapzen Terrain Tiles, derived from SRTM (NASA/USGS Shuttle Radar Topography Mission) | Static | GeoTIFF, EPSG:4326 |
| Flood hotspots | IFI-Impacts / India Flood Inventory / local verified records | Historical | Point GeoJSON |
| City boundary | OSM / verified administrative GeoJSON | Current | Polygon GeoJSON |

**CHIRPS:** Global gridded daily precipitation at ~5 km resolution, blending satellite IR and rain gauge data. Standard dataset for flood susceptibility studies where dense gauge networks are absent.

**SRTM DEM:** 30 m resolution elevation from 2000 Space Shuttle mission, resampled via Mapzen terrain tiles. Industry-standard free DEM for terrain analysis.

---

### 7.9 Geospatial Grid

The city is partitioned into a **1 km × 1 km regular grid** in **UTM Zone 44N (EPSG:32644)** — the appropriate projected CRS for central India.

```python
NAGPUR_BOUNDS = (79.00, 21.05, 79.20, 21.23)  # WGS84 lon/lat bounding box
GRID_SIZE_M = 1_000                            # 1 km cells in projected CRS
```

Grid cells are then clipped to the actual Nagpur city administrative boundary using Shapely polygon intersection, removing cells that fall outside the city. This gives **438 active zone cells** covering the study area.

Zone IDs are sequential: `Z001` through `Z438`. The ESP32 firmware and serial bridge default to `Z001` but this is configurable per device, allowing multiple sensors in different city zones.

---

### 7.10 Tools & Libraries

| Layer | Library | Version |
|---|---|---|
| Data manipulation | pandas | Standard |
| Geospatial analysis | geopandas | Standard |
| Raster DEM processing | rasterio | Standard |
| Geometry operations | shapely | ≥2 |
| Numerical gradient / DEM slope | numpy | Standard |
| Coordinate transforms | pyproj (via geopandas) | Standard |
| Notebook environment | Google Colab (Jupyter) | Python 3.12 |
| Backend geometry clipping | shapely ≥2 | Used at API serve-time |

---

### 7.11 Model Limitations & Honest Caveats

These are the honest limitations the authors documented (judges appreciate intellectual honesty):

1. **Relative, not absolute scores.** Scores are percentile ranks within this study area and input period. A zone scoring 80 is riskier than zones scoring 50 within Nagpur — it does not mean 80% probability of flooding.

2. **No labelled event validation.** The weights (0.25 / 0.25 / 0.30 / 0.20) are domain-informed but not fitted to observed flood outcomes. The model should be recalibrated as verified event records accumulate.

3. **Single-year rainfall (2024 CHIRPS).** One year may not capture extreme inter-annual variability. Multi-year CHIRPS data would improve robustness.

4. **1 km grid resolution.** Intra-zone micro-topography (e.g., a blocked drain on one street) is invisible at this scale. The IoT sensor fills this gap for monitored zones.

5. **Historical events not yet integrated.** `historical_data_available = False` for all 438 zones in the current run, so the historical weight is not applied. When a verified IFI-Impacts export is supplied, the model automatically re-runs with the 5-factor formula.

6. **Static geo-risk + live dynamic probability.** The geo-risk CSV is computed offline and baked into the database at startup. Only the real-time probability (fusing sensor reading + geo-risk) updates on every reading. The geo-risk baseline itself does not auto-update without re-running the notebook.

---

### 7.12 Why Not a Supervised ML Model?

This is the question judges most often ask. The answer is in the data:

- Nagpur has no publicly available, zone-level, date-stamped flood label dataset of sufficient size to train a supervised classifier (e.g., logistic regression, random forest, XGBoost).
- Forcing a supervised model on 438 zones × sparse labels would produce severe overfitting.
- A flood **susceptibility index** (the approach used here) is the standard methodology in published GIS/remote-sensing literature for areas with limited event records. References: UN-SPIDER, NDMA India, and academic FSI studies (e.g., Tehrany et al., 2019).
- The weighted index can be **upgraded** to a supervised model the moment enough verified event labels are available — the feature engineering pipeline (`risk_features.csv`) is already the feature matrix; adding a classifier on top is one additional step.

---

### 7.13 Upgrade Path

| Milestone | What to do |
|---|---|
| Collect 50+ verified flood events | Add to `flood_events.csv`, rerun notebook with `FLOOD_EVENTS_CSV` set |
| Multi-year rainfall | Download 2020–2024 CHIRPS, aggregate, rerun |
| Supervised ML | Use `risk_features.csv` as feature matrix; train logistic regression / XGBoost on binary flood/no-flood labels |
| Operational calibration | Validate sensor water-level thresholds against gauge records; tune `calculate_probability()` weights |
