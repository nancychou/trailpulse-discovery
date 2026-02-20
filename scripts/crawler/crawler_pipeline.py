import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import pandas as pd

# If you use supabase-py
from supabase import create_client, Client


# -----------------------------
# Helpers
# -----------------------------
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_run_id() -> str:
    # readable run id
    return f"run_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"

def require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

def safe_json(obj: Dict[str, Any]) -> Dict[str, Any]:
    # ensure json-serializable
    return json.loads(json.dumps(obj, default=str))


# -----------------------------
# TODO: plug in your pipeline stages
# -----------------------------
def crawl_wta() -> pd.DataFrame:
    """
    Return a DataFrame containing trails crawled from WTA.
    Must include a stable trail key, e.g. 'id' (WTA id), and core fields like:
    - id, name, source_url, distance_mi, elevation/gain_ft, rating, num_votes, route_type, water_source, surface, geometry_polyline, etc.
    """
    raise NotImplementedError("Plug in your WTA crawler here")

def enrich_with_osm(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich with OSM-derived fields:
    - osm_id, match_confidence, surface_primary, max_grade_p95 (if you compute here), etc.
    Return merged/enriched df.
    """
    raise NotImplementedError("Plug in your OSM enrichment here")

def compute_features_and_scores(
    df: pd.DataFrame,
    schema_version: str,
    open_elevation_url: Optional[str],
    skip_dem: bool,
) -> pd.DataFrame:
    """
    Compute:
    - difficulty_score_0_10 (calibrated w/ calculated_difficulty if available)
    - runnable % (DEM-based if available, else proxy)
    Also set:
    - schema_version
    - pipeline_run_id
    """
    # Example: you can call your existing scoring code here
    # df_scored = your_scoring_fn(df, open_elevation_url=open_elevation_url, skip_dem=skip_dem)
    # return df_scored
    raise NotImplementedError("Plug in your scoring/modeling here")


# -----------------------------
# Supabase load
# -----------------------------
def supabase_client() -> Client:
    url = require_env("SUPABASE_URL")
    key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def upsert_trails(sb: Client, df: pd.DataFrame, table: str = "trails") -> int:
    """
    Upsert trails into Supabase.
    You must ensure df columns match your table columns.
    Also ensure df has primary key column 'id' (or whichever key you use).
    """
    if "id" not in df.columns:
        raise ValueError("DataFrame must contain 'id' as primary key for upsert")

    # Convert NaN -> None for JSON
    records = df.where(pd.notnull(df), None).to_dict(orient="records")

    # Upsert in chunks to avoid payload limits
    chunk_size = 500
    total = 0
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        # on_conflict defaults to primary key, but you can specify if needed:
        # sb.table(table).upsert(chunk, on_conflict="id").execute()
        sb.table(table).upsert(chunk).execute()
        total += len(chunk)

    return total

def insert_pipeline_run(
    sb: Client,
    run_id: str,
    schema_version: str,
    status: str,
    row_count: int,
    params: Dict[str, Any],
    started_at: str,
    finished_at: str,
    notes: str = "",
    table: str = "pipeline_runs",
):
    payload = {
        "run_id": run_id,
        "schema_version": schema_version,
        "status": status,
        "row_count": row_count,
        "params": safe_json(params),
        "started_at": started_at,
        "finished_at": finished_at,
        "notes": notes,
    }
    sb.table(table).upsert(payload, on_conflict="run_id").execute()


# -----------------------------
# Main pipeline runner
# -----------------------------
def run_pipeline(schema_version: str, open_elevation_url: Optional[str], skip_dem: bool):
    run_id = new_run_id()
    started_at = utc_now_iso()

    sb = supabase_client()

    params = {
        "schema_version": schema_version,
        "open_elevation_url": open_elevation_url,
        "skip_dem": skip_dem,
        "runner": "github_actions" if os.getenv("GITHUB_ACTIONS") == "true" else "local",
    }

    try:
        # 1) Crawl WTA
        df = crawl_wta()
        if df.empty:
            raise RuntimeError("crawl_wta returned empty dataframe")

        # 2) Enrich w/ OSM (and other APIs if needed)
        df = enrich_with_osm(df)

        # 3) Compute scores/features
        df = compute_features_and_scores(
            df,
            schema_version=schema_version,
            open_elevation_url=open_elevation_url,
            skip_dem=skip_dem,
        )

        # attach run metadata (if not already)
        df["schema_version"] = schema_version
        df["pipeline_run_id"] = run_id
        df["updated_at"] = utc_now_iso()

        # 4) Load to Supabase
        upserted = upsert_trails(sb, df, table="trails")

        finished_at = utc_now_iso()
        insert_pipeline_run(
            sb,
            run_id=run_id,
            schema_version=schema_version,
            status="success",
            row_count=upserted,
            params=params,
            started_at=started_at,
            finished_at=finished_at,
            notes="weekly pipeline run",
        )

        print(f"[OK] run_id={run_id} upserted={upserted}")
        return 0

    except Exception as e:
        finished_at = utc_now_iso()
        # best-effort record failure
        try:
            insert_pipeline_run(
                sb,
                run_id=run_id,
                schema_version=schema_version,
                status="failure",
                row_count=0,
                params={**params, "error": str(e)},
                started_at=started_at,
                finished_at=finished_at,
                notes="pipeline failed",
            )
        except Exception:
            pass

        print(f"[FAIL] run_id={run_id} error={e}", file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["pipeline"], default="pipeline")
    parser.add_argument("--schema-version", default=os.getenv("SCHEMA_VERSION", "v1.0"))
    parser.add_argument("--open-elevation-url", default=os.getenv("OPEN_ELEVATION_URL", ""))
    parser.add_argument("--skip-dem", action="store_true", help="Skip DEM runnable% computation")
    args = parser.parse_args()

    open_elev = args.open_elevation_url.strip() or None

    # If no Open-Elevation URL provided, auto skip DEM
    skip_dem = args.skip_dem or (open_elev is None)

    if args.mode == "pipeline":
        sys.exit(run_pipeline(args.schema_version, open_elev, skip_dem))


if __name__ == "__main__":
    main()