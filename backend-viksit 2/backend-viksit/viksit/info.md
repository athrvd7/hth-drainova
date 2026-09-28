Your mission:

Turn raw Nagpur data into the FloodGuard Risk Engine.

This person should NOT be responsible for the dashboard or hardware.

Dataset responsibility #1 — 🌧️ Rainfall

Use:

District-wise Rainfall of Nagpur Division — Government of India OGD

Also investigate the broader:

Government rainfall catalogue — data.gov.in

And:

Regional Meteorological Centre Nagpur — Rainfall Activity

The RMC Nagpur provides daily, weekly and seasonal rainfall views, including district and river-basin rainfall maps.

Dataset responsibility #2 — ⛰️ Elevation

Use:

SRTM DEM / NASA / USGS

Deliver:

elevation
slope
low-lying areas
Dataset responsibility #3 — Historical flood information

Investigate:

India Flood Inventory / IFI-Impacts

and any usable historical Nagpur flood-event records.

Their actual job

They need to produce:

Nagpur Risk Feature Table

Something like:

Location	Rainfall	Elevation	Slope	Historical Risk	Risk Score
Zone A	High	Low	Low	High	84
Zone B	Medium	Medium	Medium	Low	43
Risk engine

Start simple and explainable.

Possible output:

0–30     LOW
31–55    MODERATE
56–75    HIGH
76–100   CRITICAL

Don't force deep learning.

If the data doesn't support supervised ML properly, use an explainable weighted risk model and clearly call it a flood susceptibility/risk engine rather than pretending it's a highly accurate prediction model.

Final deliverables
clean_rainfall.csv
clean_elevation.tif
risk_features.csv
risk_model.py
risk_scores.geojson
model_explanation.md
