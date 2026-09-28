"""
FloodGuard USB Serial Ingestion Bridge
--------------------------------------
This script automatically reads sensor output from the ESP32 connected via USB COM port
and posts readings directly into the FastAPI backend (http://127.0.0.1:8000/api/readings).

Useful if:
- ESP32 Wi-Fi is temporarily disconnected or unreachable.
- You want zero-configuration USB plug-and-play data ingestion on your PC.
"""

import re
import sys
import time
import requests
import serial.tools.list_ports
import serial

BACKEND_URL = "http://127.0.0.1:8000/api/readings"
DEFAULT_BAUD = 115200
DEVICE_ID = "esp32-usb-01"
ZONE_ID = "Z001"

def find_esp32_port():
    ports = serial.tools.list_ports.comports()
    for port in ports:
        desc = (port.description or "").lower()
        hwid = (port.hwid or "").lower()
        if "ch340" in desc or "cp210" in desc or "usb" in desc or "uart" in desc or "ch340" in hwid:
            return port.device
    if ports:
        return ports[0].device
    return None

def main():
    print("==================================================")
    print("      FLOODGUARD USB SERIAL INGESTION BRIDGE       ")
    print("==================================================")
    
    port_name = find_esp32_port()
    if not port_name:
        print("[!] No USB COM port automatically detected.")
        print("    Available ports: ", [p.device for p in serial.tools.list_ports.comports()])
        port_name = input("Enter COM port manually (e.g. COM3): ").strip()
        if not port_name:
            print("No port specified. Exiting.")
            sys.exit(1)
            
    print(f"[*] Connecting to {port_name} at {DEFAULT_BAUD} baud...")
    
    try:
        ser = serial.Serial(port_name, DEFAULT_BAUD, timeout=1)
        time.sleep(2)
        print(f"[+] Connected to {port_name} successfully!")
        print(f"[*] Ingesting readings into {BACKEND_URL}...\n")
        
        while True:
            line = ser.readline().decode('utf-8', errors='replace').strip()
            if not line:
                continue
            
            print(f"[SERIAL] {line}")
            
            # Match "[SENSOR] Dist: 28.5 cm | Level: 21.5 cm | Status: WARNING"
            # or "Water Level: 21.5 cm"
            match = re.search(r"Level:\s*([\d\.]+)\s*cm", line, re.IGNORECASE)
            if not match:
                match = re.search(r"Water Level:\s*([\d\.]+)\s*cm", line, re.IGNORECASE)
                
            if match:
                water_level = float(match.group(1))
                payload = {
                    "device_id": DEVICE_ID,
                    "zone_id": ZONE_ID,
                    "water_level_cm": water_level,
                    "rainfall_24h_mm": 0.0
                }
                # Include the ESP's locally-computed status when present
                # e.g. "[SENSOR] Dist: 28.5 cm | Level: 21.5 cm | Status: WARNING"
                status_match = re.search(r"Status:\s*(\w+)", line, re.IGNORECASE)
                if status_match:
                    payload["local_status"] = status_match.group(1).upper()
                
                try:
                    res = requests.post(BACKEND_URL, json=payload, timeout=2)
                    if res.status_code == 201:
                        data = res.json()
                        print(f"    └──> [BACKEND SYNC] HTTP 201 Created | Risk: {data.get('risk_level')} | Prob: {data.get('flood_probability')}")
                    else:
                        print(f"    └──> [BACKEND ERROR] HTTP {res.status_code}: {res.text}")
                except Exception as e:
                    print(f"    └──> [BACKEND OFFLINE] Could not reach {BACKEND_URL}: {e}")
                    
    except KeyboardInterrupt:
        print("\n[*] Stopped by user.")
    except Exception as e:
        print(f"\n[!] Serial communication error: {e}")

if __name__ == "__main__":
    main()
