-- ============================================================
-- TrailPulse PostGIS + Indexing Strategy Migration
-- Enables geospatial discovery, race aggregation,
-- and optimizes query latency to sub-200ms P95.
-- ============================================================

-- 1a. PostGIS geography column + populate from lat/lng
ALTER TABLE trails ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

UPDATE trails
SET geom = ST_SetSRID(ST_MakePoint(trailhead_lng, trailhead_lat), 4326)::geography
WHERE trailhead_lat IS NOT NULL
  AND trailhead_lng IS NOT NULL
  AND geom IS NULL;

-- 1b. Auto-update trigger: keep geom in sync with lat/lng on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_trail_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trailhead_lat IS NOT NULL AND NEW.trailhead_lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.trailhead_lng, NEW.trailhead_lat), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_trail_geom ON trails;
CREATE TRIGGER trg_update_trail_geom
  BEFORE INSERT OR UPDATE OF trailhead_lat, trailhead_lng ON trails
  FOR EACH ROW EXECUTE FUNCTION update_trail_geom();

-- ============================================================
-- 1c. Indexing Strategy
-- ============================================================

-- Spatial index (GIST) on geography column — accelerates ST_Intersects, ST_DWithin
CREATE INDEX IF NOT EXISTS idx_trails_geom
  ON trails USING GIST (geom);

-- B-tree indexes on common sort/filter columns
CREATE INDEX IF NOT EXISTS idx_trails_difficulty
  ON trails (difficulty_score_0_10 DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_trails_distance
  ON trails (distance) WHERE distance IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trails_elevation
  ON trails (elevation) WHERE elevation IS NOT NULL;

-- Composite covering index for the main list query
CREATE INDEX IF NOT EXISTS idx_trails_composite
  ON trails (distance, elevation, difficulty_score_0_10 DESC NULLS LAST)
  WHERE distance IS NOT NULL AND elevation IS NOT NULL;

-- Race indexes
CREATE INDEX IF NOT EXISTS idx_races_country     ON races (country);
CREATE INDEX IF NOT EXISTS idx_races_date        ON races (date);
CREATE INDEX IF NOT EXISTS idx_races_distance_km ON races (distance_km);

-- Group run indexes
CREATE INDEX IF NOT EXISTS idx_group_runs_time   ON group_runs (time);
CREATE INDEX IF NOT EXISTS idx_group_runs_trail  ON group_runs (trail_id);

-- Profile GIN indexes for array overlap queries
CREATE INDEX IF NOT EXISTS idx_profiles_group_runs  ON profiles USING GIN (group_run_ids);
CREATE INDEX IF NOT EXISTS idx_profiles_saved_races ON profiles USING GIN (saved_race_ids);

-- ============================================================
-- 1d. RPC: Spatial bounding-box query (used by /api/trails/bounds)
-- ============================================================
CREATE OR REPLACE FUNCTION trails_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
RETURNS SETOF trails
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM trails
  WHERE geom IS NOT NULL
    AND distance IS NOT NULL
    AND elevation IS NOT NULL
    AND ST_Intersects(
          geom,
          ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
        )
  ORDER BY difficulty_score_0_10 DESC NULLS LAST;
$$;

-- ============================================================
-- 1e. RPC: Proximity search (used by /api/trails/nearby)
-- ============================================================
CREATE OR REPLACE FUNCTION trails_nearby(
  lat double precision,
  lng double precision,
  radius_m double precision DEFAULT 50000
)
RETURNS TABLE (
  trail_id        text,
  trail_name      text,
  distance_m      double precision,
  difficulty       double precision,
  calculated_difficulty text,
  rating           double precision,
  num_votes        integer,
  trail_distance   double precision,
  trail_elevation  integer,
  highest_point    double precision,
  lat_out          double precision,
  lng_out          double precision,
  surface          text,
  route_type       text,
  water_source     text,
  image_url        text,
  difficulty_score double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id,
    t.name,
    ST_Distance(t.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_m,
    t.difficulty,
    t.calculated_difficulty,
    t.rating,
    t.num_votes,
    t.distance,
    t.elevation,
    t.highest_point,
    t.trailhead_lat,
    t.trailhead_lng,
    t.surface,
    t.route_type,
    t.water_source,
    t.image_url,
    t.difficulty_score_0_10
  FROM trails t
  WHERE t.geom IS NOT NULL
    AND t.distance IS NOT NULL
    AND t.elevation IS NOT NULL
    AND ST_DWithin(
          t.geom,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_m
        )
  ORDER BY distance_m;
$$;

-- ============================================================
-- 1f. View: Race aggregation stats by country
-- ============================================================
DROP VIEW IF EXISTS race_stats;
CREATE VIEW race_stats AS
SELECT
  country,
  COUNT(*)                          AS race_count,
  ROUND(AVG(distance_km)::numeric, 1)  AS avg_distance_km,
  MIN(distance_km)                  AS min_distance_km,
  MAX(distance_km)                  AS max_distance_km,
  ROUND(AVG(rating)::numeric, 2)       AS avg_rating,
  ROUND(AVG(difficulty_rank)::numeric, 1) AS avg_difficulty,
  array_agg(DISTINCT q)            AS all_qualifiers
FROM races, LATERAL unnest(qualifiers) AS q
GROUP BY country
ORDER BY race_count DESC;

-- ============================================================
-- Verify
-- ============================================================
SELECT 'PostGIS geom populated' AS status,
       COUNT(*) FILTER (WHERE geom IS NOT NULL) AS with_geom,
       COUNT(*) AS total
FROM trails;
