/**
 * CSV Seed Script for TrailPulse Supabase Database
 * 
 * Seeds the trails table from a CSV file with 210 real trails.
 * 
 * Run with: node scripts/seed-csv.mjs /path/to/trails_enriched_with_scores.csv
 * 
 * Make sure:
 * 1. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local
 * 2. You've run the migration.sql first in the Supabase SQL Editor
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── CSV Parsing ────────────────────────────────────────────────

/**
 * Parse a CSV line respecting quoted fields with commas and escaped quotes.
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote ("")
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    fields.push(current.trim());
    return fields;
}

function parseFloat_(val) {
    if (!val || val === '') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function parseInt_(val) {
    if (!val || val === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
}

function parseParkingTags(val) {
    if (!val || val === '') return [];
    return val.split(',').map(t => t.trim()).filter(Boolean);
}

function mapRowToTrail(header, values) {
    const row = {};
    header.forEach((col, i) => {
        row[col] = values[i] ?? '';
    });

    return {
        id: row['id'] || null,
        name: row['name'] || 'Unknown',
        rank: parseInt_(row['rank']),
        difficulty: parseFloat_(row['difficulty']),
        calculated_difficulty: row['calculated_difficulty'] || null,
        rating: parseFloat_(row['rating']),
        num_votes: parseInt_(row['num_votes']),
        distance: parseFloat_(row['distance']),
        elevation: parseFloat_(row['elevation']),
        highest_point: parseFloat_(row['highest_point']),
        trailhead_lat: parseFloat_(row['trailhead_lat']),
        trailhead_lng: parseFloat_(row['trailhead_lng']),
        surface: row['surface'] || null,
        route_type: row['route_type'] || null,
        water_source: row['water_source'] || null,
        image_url: row['image_url'] || null,
        parking_tags: parseParkingTags(row['parking_tags']),
        parking_status: row['parking_status'] || null,
        restrooms: row['restrooms'] || null,
        cell_coverage: row['cell_coverage'] || null,
        crowd_level: parseFloat_(row['crowd_level']),
        source_url: row['source_url'] || null,
        osm_id: parseInt_(row['osm_id']),
        osm_name: row['osm_name'] || null,
        match_confidence: parseFloat_(row['match_confidence']),
        max_grade_p95: parseFloat_(row['max_grade_p95']),
        surface_primary: row['surface_primary'] || null,
        surface_breakdown: row['surface_breakdown'] || null,
        distance_mi: parseFloat_(row['distance_mi']),
        grade_p95: parseFloat_(row['grade_p95']),
        surface_penalty: parseFloat_(row['surface_penalty']),
        log_distance: parseFloat_(row['log_distance']),
        wta_diff_level: parseFloat_(row['wta_diff_level']),
        difficulty_score_0_10: parseFloat_(row['difficulty_score_0_10']),
    };
}

// ─── Seed Function ──────────────────────────────────────────────
async function seed() {
    // Get CSV path from args or use default
    const csvPath = process.argv[2] || resolve(__dirname, '..', '..', 'trailpulse data', 'final data', 'trails_enriched_with_scores.csv');

    console.log(`🌱 Reading CSV from: ${csvPath}\n`);

    let csvContent;
    try {
        csvContent = readFileSync(csvPath, 'utf-8');
    } catch (err) {
        console.error(`❌ Failed to read CSV file: ${err.message}`);
        console.error(`   Make sure the file exists at: ${csvPath}`);
        process.exit(1);
    }

    // Parse CSV
    const lines = csvContent.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
    const header = parseCSVLine(lines[0]);

    console.log(`📋 CSV Header (${header.length} columns):`);
    console.log(`   ${header.join(', ')}\n`);

    const trails = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 2) continue; // skip empty rows
        const trail = mapRowToTrail(header, values);
        if (trail.id) trails.push(trail);
    }

    console.log(`📊 Parsed ${trails.length} trails from CSV\n`);

    // Check if data already exists
    const { count } = await supabase.from('trails').select('*', { count: 'exact', head: true });
    if (count && count > 0) {
        console.log(`⚠️  Database already has ${count} trails.`);
        console.log('   To re-seed, run the migration.sql first (which clears data).\n');
        process.exit(0);
    }

    // Insert in batches of 50
    const BATCH_SIZE = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < trails.length; i += BATCH_SIZE) {
        const batch = trails.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.from('trails').insert(batch).select('id, name');

        if (error) {
            console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
            // Try inserting one by one
            for (const trail of batch) {
                const { error: singleError } = await supabase.from('trails').insert(trail);
                if (singleError) {
                    console.error(`   ❌ Failed: ${trail.name} — ${singleError.message}`);
                    errors++;
                } else {
                    inserted++;
                }
            }
        } else {
            inserted += (data?.length ?? 0);
            console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} trails inserted`);
        }
    }

    console.log(`\n🎉 Seed complete! ${inserted} trails inserted, ${errors} errors.\n`);
}

seed().catch(console.error);
