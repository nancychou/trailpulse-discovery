-- TrailPulse Schema Migration
-- Run this in your Supabase SQL Editor to update the trails table schema

-- Step 1: Drop old columns that no longer exist in the new schema
ALTER TABLE trails DROP COLUMN IF EXISTS location;
ALTER TABLE trails DROP COLUMN IF EXISTS parking;
ALTER TABLE trails DROP COLUMN IF EXISTS max_grade;

-- Step 2: Add new columns
ALTER TABLE trails ADD COLUMN IF NOT EXISTS calculated_difficulty text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS rating double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS num_votes integer;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS highest_point double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS trailhead_lat double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS trailhead_lng double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS restrooms text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS osm_id bigint;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS osm_name text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS match_confidence double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS max_grade_p95 double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS surface_primary text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS surface_breakdown text;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS distance_mi double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS grade_p95 double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS surface_penalty double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS log_distance double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS wta_diff_level double precision;
ALTER TABLE trails ADD COLUMN IF NOT EXISTS difficulty_score_0_10 double precision;

-- Step 3: Clear existing mock trail data (old schema won't match)
-- WARNING: This deletes all existing trails, hazards, reviews, and group_runs
DELETE FROM group_runs;
DELETE FROM hazards;
DELETE FROM reviews;
DELETE FROM trails;
