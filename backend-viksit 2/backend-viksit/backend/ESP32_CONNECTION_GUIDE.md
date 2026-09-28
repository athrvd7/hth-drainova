# FloodGuard ESP32 backend connection guide

## 1. Start the backend

On the computer hosting the backend:

```sh
cd /Users/atharvadahake/Downloads/backend-viksit/backend
.venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is required so devices on the same Wi-Fi can connect.

Find the computer's Wi-Fi IP address:

```sh
ipconfig getifaddr en0
```

Example result: `192.168.1.25`. The ESP32 base URL is then:

```text
http://192.168.1.25:8000
```

Do not use `localhost` or `127.0.0.1` in ESP32 code. Those refer to the ESP32 itself.

## 2. Network requirements

- The ESP32 and backend computer must use the same Wi-Fi network.
- The Wi-Fi must allow devices to communicate with each other. Guest networks often block this.
- macOS Firewall must allow incoming connections for Python/Uvicorn when prompted.
- Keep the backend terminal running while testing.

## 3. ESP32 endpoint

The ESP32 only needs this endpoint:

```http
POST /api/readings
Content-Type: application/json
```

Example full request:

```http
POST http://192.168.1.25:8000/api/readings
Content-Type: application/json

{
  "device_id": "esp32-01",
  "zone_id": "Z001",
  "water_level_cm": 42.5,
  "rainfall_24h_mm": 12.0
}
```

## 4. Required payload fields

| Field | Type | Description |
| --- | --- | --- |
| `device_id` | string | Permanent sensor ID, for example `esp32-01`. |
| `zone_id` | string | FloodGuard geo-risk zone, for example `Z001`. |
| `water_level_cm` | number | Current water level in centimetres. Must be zero or greater. |

Optional fields:

| Field | Type | Description |
| --- | --- | --- |
| `rainfall_24h_mm` | number | Rainfall accumulated over the previous 24 hours. Defaults to `0`. |
| `timestamp` | ISO-8601 datetime | Observation time. Omit it to use backend time. |

Valid zones are available from:

```http
GET http://192.168.1.25:8000/api/zones
```

## 5. Expected response

A successful upload returns HTTP `201` and a prediction:

```json
{
  "device_id": "esp32-01",
  "zone_id": "Z001",
  "water_level_cm": 42.5,
  "rainfall_24h_mm": 12.0,
  "observed_at": "2026-08-16T11:38:00+00:00",
  "water_trend_cm_per_hour": 3.4,
  "geo_risk_score": 54,
  "flood_probability": 0.341,
  "risk_level": "WARNING"
}
```

Risk levels are `SAFE`, `WARNING`, `DANGER`, and `CRITICAL`.

## 6. Other backend endpoints

```http
GET /health
GET /api/zones
GET /api/zones/{zone_id}/latest
GET /api/zones/{zone_id}/history
```

Use `GET /health` to verify connectivity. A successful response is:

```json
{"status":"ok","zones_loaded":438}
```

## 7. Optional device authentication

Before using the system outside a private test network, start the backend with a device key:

```sh
FLOODGUARD_DEVICE_API_KEY="replace-with-a-long-secret" .venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

Then include this header in every ESP32 upload:

```http
X-Device-Key: replace-with-a-long-secret
```

Without the correct key, the backend returns HTTP `401`.

## 8. Error codes

| Status | Meaning | Fix |
| --- | --- | --- |
| `201` | Reading accepted and scored. | No action needed. |
| `401` | Device key missing or incorrect. | Send the configured `X-Device-Key`. |
| `404` | Unknown zone ID. | Get valid IDs from `/api/zones`. |
| `422` | Invalid JSON or invalid sensor value. | Check required fields and ensure values are numeric and non-negative. |
| no response | Network or backend unavailable. | Check Wi-Fi, computer IP, firewall, and server terminal. |
