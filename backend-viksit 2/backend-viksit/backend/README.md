# FloodGuard backend

Local API for ESP32 water readings and live FloodGuard status. It loads the generated geo-risk scores from `viksit/nagpur_floodguard_deliverables (3)/risk_features.csv` and stores incoming readings and predictions in SQLite. Override the data source with `FLOODGUARD_RISK_FEATURES=/path/to/risk_features.csv` when needed.

```sh
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --reload --port 8000
```

The API docs are at `http://127.0.0.1:8000/docs`.

ESP32 request:

```cpp
POST /api/readings
Content-Type: application/json

{"device_id":"esp32-01","zone_id":"Z001","water_level_cm":42.5,"rainfall_24h_mm":12}
```

Set `FLOODGUARD_DEVICE_API_KEY` and send it as `X-Device-Key` before exposing the endpoint outside the local network.
