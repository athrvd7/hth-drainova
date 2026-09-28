# FloodGuard ESP32 and Backend Setup

This guide connects an ESP32 water-level sensor to the FloodGuard backend. Each accepted reading is combined with the generated geographic risk score for its configured zone and returns a live flood-risk prediction.

## Requirements

- A computer running macOS, Linux, or Windows with Python 3.11 or newer.
- An ESP32 connected to the same Wi-Fi network as the computer.
- A water-level sensor connected to the ESP32.
- The generated risk data at `viksit/nagpur_floodguard_deliverables (3)/risk_features.csv`.

## 1. Start the Backend

From the repository root:

```sh
cd backend
python3 -m venv .venv-real
.venv-real/bin/pip install -r requirements.txt
export FLOODGUARD_DEVICE_API_KEY="replace-with-a-long-random-secret"
.venv-real/bin/uvicorn app:app --host 0.0.0.0 --port 8000
```

The backend loads 438 FloodGuard zones by default. To use a different generated risk table, set an absolute path before starting it:

```sh
export FLOODGUARD_RISK_FEATURES="/absolute/path/to/risk_features.csv"
```

Verify that the API is available in a second terminal:

```sh
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok","zones_loaded":438}
```

## 2. Configure the Network

The ESP32 and backend computer must be on the same Wi-Fi network. Find the computer's Wi-Fi IP address:

```sh
ipconfig getifaddr en0
```

For example, if the address is `192.168.1.25`, use this API URL in the ESP32 firmware:

```text
http://192.168.1.25:8000/api/readings
```

Do not use `localhost` or `127.0.0.1` in the ESP32 firmware. Those addresses refer to the ESP32 itself. Allow incoming connections for Python/Uvicorn in the computer firewall when prompted.

## 3. Choose the FloodGuard Zone

Each ESP32 must send the ID of the FloodGuard zone where it is installed. List valid zones:

```sh
curl http://127.0.0.1:8000/api/zones
```

For the generated risk table, examples include `Z001`, `Z002`, and `Z003`. Map the actual sensor location to the appropriate grid zone before deployment.

## 4. Send Readings from the ESP32

Send a JSON POST request to `POST /api/readings` after each sensor measurement. Required fields are `device_id`, `zone_id`, and `water_level_cm`. `rainfall_24h_mm` is optional and defaults to `0`.

```json
{
  "device_id": "esp32-01",
  "zone_id": "Z001",
  "water_level_cm": 42.5,
  "rainfall_24h_mm": 12.0
}
```

Use these headers:

```text
Content-Type: application/json
X-Device-Key: replace-with-a-long-random-secret
```

Example ESP32 request code:

```cpp
#include <HTTPClient.h>

HTTPClient http;
http.begin("http://192.168.1.25:8000/api/readings");
http.addHeader("Content-Type", "application/json");
http.addHeader("X-Device-Key", "replace-with-a-long-random-secret");

String body = "{\"device_id\":\"esp32-01\",\"zone_id\":\"Z001\","
              "\"water_level_cm\":" + String(waterLevelCm, 1) + ","
              "\"rainfall_24h_mm\":" + String(rainfall24hMm, 1) + "}";

int httpStatus = http.POST(body);
String response = http.getString();
http.end();
```

Store the backend URL, device ID, zone ID, and device key outside the main sensor loop so they can be changed without altering measurement logic.

## 5. Test Without Hardware

Test the complete prediction path locally before flashing the ESP32:

```sh
curl -X POST http://127.0.0.1:8000/api/readings \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: replace-with-a-long-random-secret" \
  -d '{"device_id":"esp32-test","zone_id":"Z001","water_level_cm":50,"rainfall_24h_mm":20}'
```

The response includes the geographic score, water-level trend, predicted probability, and live risk level:

```json
{
  "geo_risk_score": 54,
  "flood_probability": 0.236,
  "risk_level": "SAFE"
}
```

The exact probability depends on the current measurement and previous reading for the same zone.

## 6. Read Live Results

```sh
curl http://127.0.0.1:8000/api/zones/Z001/latest
curl http://127.0.0.1:8000/api/zones/Z001/history
```

Risk levels are `SAFE`, `WARNING`, `DANGER`, and `CRITICAL`.

## Operational Notes

- A backend `201` response means the reading was stored and scored.
- A `401` response means the `X-Device-Key` is missing or incorrect.
- A `404` response means the `zone_id` is not in the generated risk table.
- A `422` response means an input is invalid, such as a negative water level.
- The current probability calculation is a transparent provisional calibration. Validate it against verified local flood events before using it for emergency or public-safety decisions.
