import math
import time
from typing import List, Tuple, Optional

import numpy as np
import pandas as pd
import requests

from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# -----------------------------
# Config
# -----------------------------
OPEN_ELEVATION_URL = "http://localhost:8080/api/v1/lookup"  # self-host
POINT_SPACING_M = 30  # densify spacing (meters). 20m = more detail, more API calls
BATCH_SIZE = 100      # Open-Elevation can handle batches; tune for your server

GRADE_THRESHOLD_PCT = 12.0  # runnable threshold
SURFACE_RUNNABLE_MAX = 0.6  # only count runnable if surface penalty <= this (optional)

# Difficulty weights are learned from WTA labels, not manually tuned.


# -----------------------------
# Polyline decode (Google Encoded Polyline)
# -----------------------------
def decode_polyline(polyline: str) -> List[Tuple[float, float]]:
    """Decode a Google encoded polyline string into [(lat, lon), ...]."""
    if not isinstance(polyline, str) or not polyline:
        return []
    index, lat, lng = 0, 0, 0
    coordinates = []
    length = len(polyline)

    while index < length:
        shift, result = 0, 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift, result = 0, 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append((lat / 1e5, lng / 1e5))

    return coordinates


# -----------------------------
# Distance helpers (imperial output)
# -----------------------------
EARTH_RADIUS_M = 6371000.0
M_TO_FT = 3.280839895

def haversine_m(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    s = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(s))

def densify_polyline(points: List[Tuple[float, float]], spacing_m: float) -> List[Tuple[float, float]]:
    """Insert points along the polyline so consecutive points are about spacing_m apart."""
    if len(points) < 2:
        return points

    out = [points[0]]
    for i in range(len(points) - 1):
        p0, p1 = points[i], points[i + 1]
        seg_len = haversine_m(p0, p1)
        if seg_len <= 0:
            continue
        steps = int(seg_len // spacing_m)
        for s in range(1, steps + 1):
            t = (s * spacing_m) / seg_len
            if t >= 1:
                break
            lat = p0[0] + (p1[0] - p0[0]) * t
            lon = p0[1] + (p1[1] - p0[1]) * t
            out.append((lat, lon))
        out.append(p1)
    return out


# -----------------------------
# Open-Elevation client
# -----------------------------
def open_elevation_lookup(points: List[Tuple[float, float]], url: str, batch_size: int = 100, sleep_s: float = 0.0) -> List[Optional[float]]:
    """
    Returns elevations in meters (as floats) for each (lat, lon).
    If any request fails, returns None for that batch.
    """
    elevations = []
    session = requests.Session()

    for start in range(0, len(points), batch_size):
        chunk = points[start:start + batch_size]
        payload = {"locations": [{"latitude": lat, "longitude": lon} for lat, lon in chunk]}

        try:
            r = session.post(url, json=payload, timeout=30)
            r.raise_for_status()
            data = r.json()
            results = data.get("results", [])
            # Expect same order
            chunk_elev = [res.get("elevation", None) for res in results]
            if len(chunk_elev) != len(chunk):
                chunk_elev = [None] * len(chunk)
        except Exception:
            chunk_elev = [None] * len(chunk)

        elevations.extend(chunk_elev)
        if sleep_s > 0:
            time.sleep(sleep_s)

    return elevations


# -----------------------------
# Surface / WTA difficulty label mapping
# -----------------------------
def surface_penalty(row) -> float:
    val = row.get("surface_primary", None)
    if pd.isna(val) or val is None:
        val = row.get("surface", None)
    mapping = {"Paved": 0.0, "Gravel": 0.2, "Dirt/Soil": 0.4}
    if pd.isna(val) or val is None:
        return 0.5
    return mapping.get(str(val).strip(), 0.5)

def map_wta_label(label) -> float:
    if label is None or pd.isna(label):
        return np.nan
    label = str(label).strip()
    return {
        "Easy": 0.0,
        "Easy/Moderate": 0.5,
        "Moderate": 1.0,
        "Moderate/Hard": 1.5,
        "Hard": 2.0,
    }.get(label, np.nan)


# -----------------------------
# Runnable% from DEM profile
# -----------------------------
def runnable_pct_from_dem(polyline_str: str, surf_pen: float) -> Tuple[Optional[float], Optional[float]]:
    """
    Returns (runnable_pct, valid_coverage_pct)
    runnable_pct is distance-weighted fraction runnable across the polyline.
    valid_coverage_pct indicates % of segments with valid elevation.
    """
    pts = decode_polyline(polyline_str)
    if len(pts) < 2:
        return (np.nan, np.nan)

    pts_d = densify_polyline(pts, POINT_SPACING_M)
    elev_m = open_elevation_lookup(pts_d, OPEN_ELEVATION_URL, batch_size=BATCH_SIZE)

    # compute per-segment runnable
    runnable_dist_m = 0.0
    total_dist_m = 0.0
    valid_seg_dist_m = 0.0

    for i in range(len(pts_d) - 1):
        p0, p1 = pts_d[i], pts_d[i + 1]
        dx_m = haversine_m(p0, p1)
        if dx_m <= 0:
            continue

        total_dist_m += dx_m

        e0, e1 = elev_m[i], elev_m[i + 1]
        if e0 is None or e1 is None:
            continue

        valid_seg_dist_m += dx_m

        dz_m = (e1 - e0)
        # grade% in imperial terms cancels out if consistent units; still compute properly:
        grade_pct = 100.0 * (dz_m / dx_m)

        runnable_here = (abs(grade_pct) <= GRADE_THRESHOLD_PCT) and (surf_pen <= SURFACE_RUNNABLE_MAX)
        if runnable_here:
            runnable_dist_m += dx_m

    if total_dist_m == 0:
        return (np.nan, np.nan)

    coverage_pct = 100.0 * (valid_seg_dist_m / total_dist_m) if total_dist_m > 0 else np.nan
    runnable_pct = 100.0 * (runnable_dist_m / total_dist_m)
    return (round(runnable_pct, 1), round(coverage_pct, 1))


# -----------------------------
# Main: compute scores on merged CSV
# -----------------------------
def compute_scores(
    csv_in="/mnt/data/trails_merged_deduplicated.csv",
    csv_out="/mnt/data/trails_scored_imperial_dem.csv",
):
    df = pd.read_csv(csv_in)
    unnamed = [c for c in df.columns if str(c).lower().startswith("unnamed")]
    if unnamed:
        df = df.drop(columns=unnamed)

    out = df.copy()

    # Imperial distance/gain
    out["distance_mi"] = out.get("wta_distance_mi")
    if "distance" in out.columns:
        out["distance_mi"] = out["distance_mi"].fillna(out["distance"])

    out["gain_ft"] = out.get("wta_gain_ft")
    if "derived_gain_ft" in out.columns:
        out["gain_ft"] = out["gain_ft"].fillna(out["derived_gain_ft"])

    out.loc[out["distance_mi"] <= 0, "distance_mi"] = np.nan
    out["gain_per_mile_ft"] = out["gain_ft"] / out["distance_mi"]

    # Grade: prefer p95 then max_grade
    out["grade_p95"] = out.get("max_grade_p95")
    if "max_grade" in out.columns:
        out["grade_p95"] = out["grade_p95"].fillna(out["max_grade"])
    grade_med = out["grade_p95"].median(skipna=True)
    out["grade_p95_filled"] = out["grade_p95"].fillna(grade_med)

    out["surface_penalty"] = out.apply(surface_penalty, axis=1)
    out["log_distance"] = np.log1p(out["distance_mi"])

    # Calibrate difficulty using WTA labels
    out["wta_diff_level"] = out["calculated_difficulty"].apply(map_wta_label) if "calculated_difficulty" in out.columns else np.nan

    features = ["gain_per_mile_ft", "grade_p95_filled", "surface_penalty", "log_distance"]
    X = out[features].copy()
    for c in features:
        X[c] = X[c].fillna(X[c].median(skipna=True))

    labeled = out["wta_diff_level"].notna()
    if labeled.sum() >= 10:
        model = Pipeline([("scaler", StandardScaler()), ("ridge", Ridge(alpha=1.0, random_state=0))])
        model.fit(X.loc[labeled], out.loc[labeled, "wta_diff_level"])
        pred_level = model.predict(X)
    else:
        # fallback heuristic mapped into 0..2
        z = (
            0.45 * (X["gain_per_mile_ft"] - X["gain_per_mile_ft"].mean()) / (X["gain_per_mile_ft"].std(ddof=0) + 1e-9)
            + 0.30 * (X["grade_p95_filled"] - X["grade_p95_filled"].mean()) / (X["grade_p95_filled"].std(ddof=0) + 1e-9)
            + 0.15 * X["surface_penalty"]
            + 0.10 * (X["log_distance"] - X["log_distance"].mean()) / (X["log_distance"].std(ddof=0) + 1e-9)
        )
        pred_level = 2.0 * (1 / (1 + np.exp(-np.clip(z, -50, 50))))

    out["difficulty_level_pred_0_2"] = np.clip(pred_level, 0.0, 2.0)
    out["difficulty_score_0_100"] = (out["difficulty_level_pred_0_2"] / 2.0 * 100.0).round(1)

    # Runnable% using DEM profile on the trail polyline
    runnable_vals = []
    coverage_vals = []
    for _, row in out.iterrows():
        poly = row.get("geometry_polyline", None)
        surf_pen = row.get("surface_penalty", 0.5)
        if pd.isna(poly) or not isinstance(poly, str) or not poly:
            runnable_vals.append(np.nan)
            coverage_vals.append(np.nan)
            continue
        r_pct, cov_pct = runnable_pct_from_dem(poly, surf_pen)
        runnable_vals.append(r_pct)
        coverage_vals.append(cov_pct)

    out["trail_runnable_pct_dem"] = runnable_vals
    out["elevation_profile_coverage_pct"] = coverage_vals

    out.to_csv(csv_out, index=False)
    return csv_out


if __name__ == "__main__":
    path = compute_scores()
    print("Saved:", path)