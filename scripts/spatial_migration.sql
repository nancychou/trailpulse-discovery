-- TrailPulse Spatial Index Migration
-- Run this in your Supabase SQL Editor to enable spatial search

-- Step 1: Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Add a geography column computed from lat/lng
ALTER TABLE trails ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- Step 3: Populate the geom column from existing lat/lng data
UPDATE trails
SET geom = ST_SetSRID(ST_MakePoint(trailhead_lng, trailhead_lat), 4326)::geography
WHERE trailhead_lat IS NOT NULL AND trailhead_lng IS NOT NULL;

-- Step 4: Create a spatial (GIST) index for fast bounding-box queries
CREATE INDEX IF NOT EXISTS idx_trails_geom ON trails USING GIST (geom);

-- Step 5: Create a trigger to auto-populate geom on INSERT/UPDATE
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

-- Step 6: Create the RPC function for bounding-box spatial search
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
    AND ST_Intersects(
      geom,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    )
  ORDER BY difficulty_score_0_10 DESC NULLS LAST;
$$;
