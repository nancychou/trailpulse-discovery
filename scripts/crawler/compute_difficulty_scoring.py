import argparse
import numpy as np
import pandas as pd

from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def surface_penalty(row) -> float:
    val = row.get("surface_primary", None)
    if pd.isna(val) or val is None:
        val = row.get("surface", None)

    mapping = {"Paved": 0.0, "Gravel": 0.2, "Dirt/Soil": 0.4}
    if pd.isna(val) or val is None:
        return 0.5
    return mapping.get(str(val).strip(), 0.5)


def map_wta_label(label):
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


def compute_scores(csv_in: str, csv_out: str):
    df = pd.read_csv(csv_in)

    # drop junk columns
    unnamed = [c for c in df.columns if str(c).lower().startswith("unnamed")]
    if unnamed:
        df = df.drop(columns=unnamed)

    out = df.copy()

    # -----------------------------
    # Imperial features
    # -----------------------------
    out["distance_mi"] = pd.to_numeric(out.get("wta_distance_mi"), errors="coerce")
    if "distance" in out.columns:
        out["distance_mi"] = out["distance_mi"].fillna(pd.to_numeric(out["distance"], errors="coerce"))
    if "osm_distance_mi" in out.columns:
        out["distance_mi"] = out["distance_mi"].fillna(pd.to_numeric(out["osm_distance_mi"], errors="coerce"))

    out["gain_ft"] = pd.to_numeric(out.get("wta_gain_ft"), errors="coerce")
    if "derived_gain_ft" in out.columns:
        out["gain_ft"] = out["gain_ft"].fillna(pd.to_numeric(out["derived_gain_ft"], errors="coerce"))

    out.loc[out["distance_mi"] <= 0, "distance_mi"] = np.nan
    out["gain_per_mile_ft"] = out["gain_ft"] / out["distance_mi"]

    out["grade_p95"] = pd.to_numeric(out.get("max_grade_p95"), errors="coerce")
    if "max_grade" in out.columns:
        out["grade_p95"] = out["grade_p95"].fillna(pd.to_numeric(out["max_grade"], errors="coerce"))

    out["surface_penalty"] = out.apply(surface_penalty, axis=1)
    out["log_distance"] = np.log1p(out["distance_mi"])

    # -----------------------------
    # WTA difficulty label
    # -----------------------------
    if "calculated_difficulty" in out.columns:
        out["wta_diff_level"] = out["calculated_difficulty"].apply(map_wta_label)
    else:
        out["wta_diff_level"] = np.nan

    feature_cols = ["gain_per_mile_ft", "grade_p95", "surface_penalty", "log_distance"]
    X = out[feature_cols].copy()

    for c in feature_cols:
        X[c] = pd.to_numeric(X[c], errors="coerce")

    labeled = out["wta_diff_level"].notna()

    # -----------------------------
    # Train model (if enough labels)
    # -----------------------------
    if labeled.sum() >= 10:
        model = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=1.0, random_state=0)),
        ])

        model.fit(X.loc[labeled], out.loc[labeled, "wta_diff_level"])
        pred_level = model.predict(X)
    else:
        # fallback heuristic
        X_imp = X.copy()
        for c in feature_cols:
            X_imp[c] = X_imp[c].fillna(X_imp[c].median(skipna=True))

        def z(s):
            return (s - s.mean()) / (s.std(ddof=0) + 1e-9)

        raw = (
            0.45 * z(X_imp["gain_per_mile_ft"]) +
            0.30 * z(X_imp["grade_p95"]) +
            0.15 * X_imp["surface_penalty"] +
            0.10 * z(X_imp["log_distance"])
        )
        pred_level = 2.0 / (1.0 + np.exp(-np.clip(raw, -50, 50)))

    # -----------------------------
    # Final 0–10 difficulty score
    # -----------------------------
    pred_level = np.clip(pred_level, 0.0, 2.0)

    out["difficulty_score_0_10"] = (pred_level * 5.0).round(1)

    out.to_csv(csv_out, index=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to input CSV")
    parser.add_argument("--output", default="trails_scored.csv", help="Output CSV path")
    args = parser.parse_args()

    compute_scores(args.input, args.output)
    print(f"Saved to {args.output}")