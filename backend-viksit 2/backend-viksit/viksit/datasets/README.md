# Nagpur FloodGuard input data

- `nagpur_chirps_daily_2024.csv`: Daily 0.05° CHIRPS v2 precipitation cells that intersect the Nagpur study area (78.95–79.25°E, 21.00–21.25°N), extracted from the 2024 global CHIRPS daily NetCDF.
- `nagpur_terrain_dem.tif`: Elevation GeoTIFF covering the Nagpur study area, built from Mapzen Terrain Tiles (Terrarium elevation encoding), EPSG:4326.

## Sources

- CHIRPS v2 daily: Climate Hazards Center, https://data.chc.ucsb.edu/products/CHIRPS-2.0/
- Terrain tiles: https://registry.opendata.aws/terrain-tiles/

The notebook still needs verified historical flood-event points. Do not use a synthetic fallback as flood evidence.
