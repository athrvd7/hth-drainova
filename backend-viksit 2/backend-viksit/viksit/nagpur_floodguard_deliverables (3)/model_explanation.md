# FloodGuard model explanation

## Purpose
An explainable flood susceptibility score, not a flood prediction model.

## Formula
Without verified flood events: `score = 100 × (0.25 maximum-1-day-rainfall + 0.25 maximum-3-day-rainfall + 0.30 low-elevation + 0.20 low-slope)`. With verified events, the available weights are rescaled to include a 0.20 historical-event factor.

Each factor is normalized as a percentile within the current study-area run. Lower elevation and lower slope receive higher factor values. The score is therefore comparative, not an absolute probability of flooding.

## Inputs and provenance
`clean_rainfall.csv` comes from the supplied rainfall CSV. The bundled input is CHIRPS v2 daily precipitation for the Nagpur area, 2024-01-01 to 2024-12-31, extracted from https://data.chc.ucsb.edu/products/CHIRPS-2.0/.

`clean_elevation.tif` comes from the supplied DEM. The bundled Nagpur-area EPSG:4326 DEM was built from Mapzen Terrain Tiles: https://registry.opendata.aws/terrain-tiles/.

## Outputs
`max_daily_rainfall_mm` and `max_3day_rainfall_mm` capture short-duration rainfall extremes. `rainfall_mm` remains the annual total for provenance. `historical_data_available` records whether historical evidence affected the score. `low_lying` marks the lowest elevation quartile. The `*_factor` columns show normalized inputs and the `*_contribution` columns show each factor contribution in score points. The `*_factor` columns show normalized inputs and the `*_contribution` columns show each factor's contribution in score points; their sum, rounded to an integer, is `risk_score`. The generated `risk_class` field contains the categorical class for each score: LOW, MODERATE, HIGH, or CRITICAL.

## Classes
0–30 LOW, 31–55 MODERATE, 56–75 HIGH, 76–100 CRITICAL.

## Limits
Scores are relative to this study area and input period. The event features are derived from the supplied 2024 CHIRPS period. Validate their thresholds and score weights against verified local flood events before operational use.

Rainfall is currently aggregated over the supplied 2024 CHIRPS period. Before operational use, add event-window features such as 1-day maximum rainfall and 3-day accumulation, then validate those features against verified local flood events.
