"""Explainable, relative flood-susceptibility scoring for Nagpur zones."""

import pandas as pd


REQUIRED_COLUMNS = ("max_daily_rainfall_mm", "max_3day_rainfall_mm", "elevation_m", "slope_deg")
RISK_CLASSES = ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def _percentile(series, ascending=True):
    return series.rank(pct=True, ascending=ascending).fillna(0.5)


def score(features):
    """Return a scored copy of a zone feature table with audit contributions."""
    missing = set(REQUIRED_COLUMNS) - set(features.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    out = features.copy()
    for column in REQUIRED_COLUMNS:
        out[column] = pd.to_numeric(out[column], errors="coerce")
    if out[list(REQUIRED_COLUMNS)].isna().any().any():
        raise ValueError("Rainfall-event features, elevation, and slope must be numeric and present.")
    if (out[list(REQUIRED_COLUMNS)] < 0).any().any():
        raise ValueError("Rainfall-event features, elevation, and slope cannot be negative.")

    weights = {
        "max_daily_rainfall": 0.25,
        "max_3day_rainfall": 0.25,
        "low_elevation": 0.30,
        "low_slope": 0.20,
    }
    out["max_daily_rainfall_factor"] = _percentile(out["max_daily_rainfall_mm"])
    out["max_3day_rainfall_factor"] = _percentile(out["max_3day_rainfall_mm"])
    out["low_elevation_factor"] = _percentile(out["elevation_m"], ascending=False)
    out["low_slope_factor"] = _percentile(out["slope_deg"], ascending=False)
    out["low_lying"] = out["elevation_m"] <= out["elevation_m"].quantile(0.25)

    historical_available = out.get("historical_data_available", pd.Series(False, index=out.index))
    historical_available = historical_available.astype(str).str.lower().eq("true")
    use_historical = historical_available.all()
    out["historical_data_available"] = historical_available
    out["historical_factor"] = 0.0
    if use_historical:
        if "historical_event_count" not in out:
            raise ValueError("historical_event_count is required when historical data is available.")
        out["historical_event_count"] = pd.to_numeric(out["historical_event_count"], errors="coerce")
        if out["historical_event_count"].isna().any() or (out["historical_event_count"] < 0).any():
            raise ValueError("historical_event_count must be present and non-negative.")
        out["historical_factor"] = _percentile(out["historical_event_count"])
        weights["historical"] = 0.20

    total_weight = sum(weights.values())
    for factor, weight in weights.items():
        out[f"{factor}_contribution"] = (100 * weight / total_weight) * out[f"{factor}_factor"]
    contribution_columns = [f"{factor}_contribution" for factor in weights]
    out["risk_score"] = out[contribution_columns].sum(axis=1).round().astype(int)
    out["risk_class"] = pd.cut(out["risk_score"], [-1, 30, 55, 75, 100], labels=RISK_CLASSES)
    return out
