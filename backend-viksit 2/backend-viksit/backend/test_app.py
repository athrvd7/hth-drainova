"""Run with `python test_app.py` after starting `uvicorn app:app --port 8000`."""

import csv
import json
from pathlib import Path
from urllib.request import Request, urlopen


def request(path, payload=None):
    body = json.dumps(payload).encode() if payload else None
    headers = {"Content-Type": "application/json"} if body else {}
    with urlopen(Request(f"http://127.0.0.1:8000{path}", data=body, headers=headers), timeout=5) as response:
        return response.status, json.load(response)


status, health = request("/health")
assert status == 200 and health["status"] == "ok" and health["zones_loaded"] == 438
status, zones = request("/api/zones")
assert status == 200 and len(zones) == 438 and any(zone["zone_id"] == "Z001" for zone in zones)
z001_geo_risk = next(zone["geo_risk_score"] for zone in zones if zone["zone_id"] == "Z001")
assert request("/api/readings", {"device_id": "esp32-test", "zone_id": "Z001", "water_level_cm": 40})[0] == 201
status, prediction = request("/api/readings", {"device_id": "esp32-test", "zone_id": "Z001", "water_level_cm": 180, "rainfall_24h_mm": 80})
assert status == 201 and prediction["geo_risk_score"] == z001_geo_risk and prediction["risk_level"] in {"WARNING", "DANGER", "CRITICAL"}
assert request("/api/zones/Z001/latest")[0] == 200

status, prediction = request("/api/readings", {"device_id": "esp32-test", "zone_id": "Z001", "water_level_cm": 25})
assert status == 201 and prediction["risk_level"] in {"DANGER", "CRITICAL"}

spike_levels = [request("/api/readings", {"device_id": "esp32-test", "zone_id": "Z002", "water_level_cm": level})[1]["risk_level"] for level in (8, 8, 8, 8, 8, 13, 8, 8)]
assert all(level == spike_levels[0] for level in spike_levels)

rainfall_csv = Path(__file__).resolve().parent.parent / "viksit/NEW_floodguard_real_evidence_package/historical_rainfall_nagpur.csv"
with rainfall_csv.open(newline="") as file:
    wettest_date = max(csv.DictReader(file), key=lambda row: float(row["rainfall_mm"]))["date"]
status, prediction = request("/api/readings", {"device_id": "esp32-test", "zone_id": "Z003", "water_level_cm": 5, "timestamp": f"{wettest_date}T12:00:00+00:00"})
assert status == 201 and prediction["rainfall_24h_mm"] > 0
print("API smoke test passed")
