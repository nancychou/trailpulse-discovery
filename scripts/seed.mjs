/**
 * Seed Script for TrailPulse Supabase Database
 * 
 * Run with: node scripts/seed.mjs
 * 
 * Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 * before running this script.
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

// ─── Trail Data ─────────────────────────────────────────────────
const MOCK_REVIEWS = [
    {
        user_name: 'Marcus G.',
        avatar_url: 'https://picsum.photos/seed/marcus/100/100',
        rating: 4.5,
        date: '2 HOURS AGO',
        text: '"Beautiful conditions today! The trail is dry until the 4-mile mark. Watch out for some loose gravel on the descent."'
    },
    {
        user_name: 'Sarah L.',
        avatar_url: 'https://picsum.photos/seed/sarah/100/100',
        rating: 5.0,
        date: 'YESTERDAY',
        text: '"The bear was definitely active today. Saw it about 200 yards off-trail. Keep your voices up!"'
    }
];

const MOCK_HAZARDS = [
    { type: 'Wildlife', message: 'Bear sighting reported near the 3.5-mile marker. Exercise caution and carry bear spray.', date: '30 DAYS' },
    { type: 'Access', message: 'Road maintenance on primary access route - expect up to 10min delays.', date: '30 DAYS' }
];

const trails = [
    { name: 'Mount Si Trail', location: 'North Bend, WA', rank: 1, difficulty: 8.5, distance: 8.0, elevation: 3150, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'Aid Station', image_url: 'https://images.unsplash.com/photo-1544198365-f5d60b6d8190?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['Discover Pass'], max_grade: 22, parking_status: 'Trailhead lot (25 spots). Paid Discover Pass required at kiosk.', cell_coverage: 'Partial: Good on ridges, none in basins.', crowd_level: 85, hazards: MOCK_HAZARDS, reviews: MOCK_REVIEWS },
    { name: 'Rattlesnake Ledge', location: 'North Bend, WA', rank: 2, difficulty: 5.0, distance: 4.0, elevation: 1160, surface: 'Gravel', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 15, parking_status: 'Large paved lot. Fills up by 8am on weekends.', cell_coverage: 'Full coverage throughout.', crowd_level: 95, hazards: [], reviews: MOCK_REVIEWS.slice(0, 1) },
    { name: 'Snow Lake Trail', location: 'Snoqualmie Pass, WA', rank: 3, difficulty: 6.0, distance: 7.2, elevation: 1800, surface: 'Rocky', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 18, parking_status: 'Requires Northwest Forest Pass. Heavily trafficked alpine wilderness.', cell_coverage: 'None at lake, spotty at trailhead.', crowd_level: 90, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Colchuck Lake', location: 'Leavenworth, WA', rank: 4, difficulty: 8.0, distance: 8.0, elevation: 2200, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'No', parking_tags: ['NW Forest Pass', 'Day-Use Permit'], max_grade: 25, parking_status: 'Requires day-use permit and trailhead quota. NW Forest Pass required.', cell_coverage: 'Zero coverage beyond trailhead.', crowd_level: 98, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Wallace Falls', location: 'Gold Bar, WA', rank: 5, difficulty: 5.5, distance: 5.6, elevation: 1300, surface: 'Gravel/Dirt', route_type: 'Out-and-back', water_source: 'Aid Station', image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['Discover Pass'], max_grade: 12, parking_status: 'Discover Pass required. Lot usually full by mid-morning.', cell_coverage: 'Good near falls.', crowd_level: 70, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Skyline Trail', location: 'Mount Rainier, WA', rank: 6, difficulty: 7.5, distance: 5.5, elevation: 1700, surface: 'Dirt/Rocky', route_type: 'Loop', water_source: 'Aid Station', image_url: 'https://images.unsplash.com/photo-1464457312035-3d7d0e0c058e?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'No', parking_tags: ['National Park Pass'], max_grade: 20, parking_status: 'Paradise parking lot. Arrive by 7am or use the shuttle.', cell_coverage: 'Good near Paradise Visitor Center.', crowd_level: 100, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Lake 22', location: 'Mountain Loop Hwy, WA', rank: 7, difficulty: 6.0, distance: 5.4, elevation: 1350, surface: 'Rooty', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 14, parking_status: 'Northwest Forest Pass required. Potholes on access road.', cell_coverage: 'Spotty/None.', crowd_level: 80, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Poo Poo Point', location: 'Issaquah, WA', rank: 8, difficulty: 7.0, distance: 7.2, elevation: 1750, surface: 'Gravel', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fab35?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['Discover Pass'], max_grade: 18, parking_status: 'Chirico Trailhead lot is small and fills quickly. Discover Pass required.', cell_coverage: 'Full coverage.', crowd_level: 90, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Mailbox Peak (New Trail)', location: 'North Bend, WA', rank: 9, difficulty: 9.5, distance: 9.4, elevation: 4000, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['Discover Pass'], max_grade: 35, parking_status: 'Upper and lower lots available. Discover Pass required.', cell_coverage: 'Good at the summit mailbox.', crowd_level: 65, hazards: [{ type: 'Incline', message: 'Extremely steep sections. Trekking poles highly recommended.', date: 'Permanent' }], reviews: MOCK_REVIEWS },
    { name: 'Lake Serene', location: 'Index, WA', rank: 10, difficulty: 7.5, distance: 7.2, elevation: 2000, surface: 'Rocky', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 22, parking_status: 'NW Forest Pass. Massive boulder field at the lake.', cell_coverage: 'None.', crowd_level: 75, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Heather-Maple Pass Loop', location: 'North Cascades, WA', rank: 11, difficulty: 6.5, distance: 7.2, elevation: 2000, surface: 'Dirt/Rocky', route_type: 'Loop', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 16, parking_status: 'Extremely popular in larch season (Oct). Pass required.', cell_coverage: 'None.', crowd_level: 95, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Chain Lakes Loop', location: 'Mount Baker, WA', rank: 12, difficulty: 6.0, distance: 7.0, elevation: 1800, surface: 'Rocky', route_type: 'Loop', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Easy', parking_tags: ['NW Forest Pass'], max_grade: 14, parking_status: 'Artist Point lot is large but serves multiple trails.', cell_coverage: 'Spotty.', crowd_level: 60, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Blue Lake', location: 'North Cascades, WA', rank: 13, difficulty: 4.5, distance: 4.6, elevation: 1050, surface: 'Dirt/Rocky', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1444464666168-49d633b867ad?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Easy', parking_tags: ['NW Forest Pass'], max_grade: 10, parking_status: 'Small trailhead lot on Hwy 20. Pass required.', cell_coverage: 'Zero.', crowd_level: 50, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Gothic Basin', location: 'Mountain Loop Hwy, WA', rank: 14, difficulty: 8.5, distance: 9.0, elevation: 2600, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'Natural Lake', image_url: 'https://images.unsplash.com/photo-1464270131427-43225fdd4d1a?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 30, parking_status: 'Requires NW Forest Pass. Access via Barlow Pass.', cell_coverage: 'None.', crowd_level: 40, hazards: [{ type: 'Scrambling', message: 'Route requires Class 2 scrambling in several sections.', date: 'Permanent' }], reviews: MOCK_REVIEWS },
    { name: 'Hurricane Ridge Trails', location: 'Olympic NP, WA', rank: 15, difficulty: 3.5, distance: 3.0, elevation: 800, surface: 'Paved', route_type: 'Loop', water_source: 'Aid Station', image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Easy', parking_tags: ['National Park Pass'], max_grade: 8, parking_status: 'Large lot at Visitor Center. Access subject to seasonal road closures.', cell_coverage: 'Excellent near lodge.', crowd_level: 95, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Mount Storm King', location: 'Lake Crescent, WA', rank: 16, difficulty: 9.0, distance: 3.8, elevation: 2100, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Easy', parking_tags: ['National Park Pass'], max_grade: 45, parking_status: 'Large lot shared with Marymere Falls.', cell_coverage: 'Good near summit.', crowd_level: 85, hazards: [{ type: 'Fixed Ropes', message: 'Final ascent uses fixed ropes. Not maintained by NPS.', date: 'Permanent' }], reviews: MOCK_REVIEWS },
    { name: 'Kendall Katwalk (PCT)', location: 'Snoqualmie Pass, WA', rank: 17, difficulty: 8.0, distance: 11.0, elevation: 2700, surface: 'Rocky', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['NW Forest Pass'], max_grade: 12, parking_status: 'Shared PCT lot. Fills early with thru-hikers.', cell_coverage: 'Good on ridges.', crowd_level: 50, hazards: [{ type: 'Exposure', message: 'Narrow trail blasted into cliffside with significant drop-offs.', date: 'Permanent' }], reviews: MOCK_REVIEWS },
    { name: 'Sahale Arm', location: 'North Cascades, WA', rank: 18, difficulty: 9.8, distance: 12.0, elevation: 4200, surface: 'Rocky/Technical', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['National Park Pass', 'Quota'], max_grade: 30, parking_status: 'Cascade Pass trailhead lot fills by 6am. High demand.', cell_coverage: 'None.', crowd_level: 60, hazards: [], reviews: MOCK_REVIEWS },
    { name: 'Shi Shi Beach', location: 'Olympic Coast, WA', rank: 19, difficulty: 4.5, distance: 8.0, elevation: 200, surface: 'Sand/Mud', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Easy', parking_tags: ['Makah Rec Pass'], max_grade: 5, parking_status: 'Requires Makah Recreation Pass. Park in designated private lot.', cell_coverage: 'Good near Neah Bay.', crowd_level: 30, hazards: [{ type: 'Mud', message: 'Extremely muddy forest sections year-round.', date: 'Permanent' }], reviews: MOCK_REVIEWS },
    { name: 'Little Si', location: 'North Bend, WA', rank: 20, difficulty: 5.0, distance: 4.7, elevation: 1300, surface: 'Dirt/Rocky', route_type: 'Out-and-back', water_source: 'None', image_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1200&h=800', parking: 'Limited', parking_tags: ['Discover Pass'], max_grade: 12, parking_status: 'Shared overflow lot with Mt Si. Paid pass required.', cell_coverage: 'Excellent.', crowd_level: 90, hazards: [], reviews: MOCK_REVIEWS },
];

// ─── Seed Function ──────────────────────────────────────────────
async function seed() {
    console.log('🌱 Starting seed...\n');

    // Check if data already exists
    const { count } = await supabase.from('trails').select('*', { count: 'exact', head: true });
    if (count && count > 0) {
        console.log(`⚠️  Database already has ${count} trails. Skipping seed to avoid duplicates.`);
        console.log('   To re-seed, delete all rows from the trails table first.\n');
        process.exit(0);
    }

    for (const trail of trails) {
        const { hazards, reviews, ...trailData } = trail;

        // Insert trail
        const { data: insertedTrail, error: trailError } = await supabase
            .from('trails')
            .insert(trailData)
            .select()
            .single();

        if (trailError) {
            console.error(`❌ Error inserting trail "${trail.name}":`, trailError.message);
            continue;
        }

        console.log(`✅ Trail: ${insertedTrail.name} (${insertedTrail.id})`);

        // Insert hazards
        if (hazards && hazards.length > 0) {
            const hazardRows = hazards.map(h => ({
                trail_id: insertedTrail.id,
                type: h.type,
                message: h.message,
                date: h.date,
            }));
            const { error: hazardError } = await supabase.from('hazards').insert(hazardRows);
            if (hazardError) {
                console.error(`   ⚠️  Error inserting hazards for ${trail.name}:`, hazardError.message);
            } else {
                console.log(`   🔶 ${hazards.length} hazard(s) added`);
            }
        }

        // Insert reviews
        if (reviews && reviews.length > 0) {
            const reviewRows = reviews.map(r => ({
                trail_id: insertedTrail.id,
                user_name: r.user_name,
                avatar_url: r.avatar_url,
                rating: r.rating,
                date: r.date,
                text: r.text,
            }));
            const { error: reviewError } = await supabase.from('reviews').insert(reviewRows);
            if (reviewError) {
                console.error(`   ⚠️  Error inserting reviews for ${trail.name}:`, reviewError.message);
            } else {
                console.log(`   💬 ${reviews.length} review(s) added`);
            }
        }
    }

    // Insert sample group runs
    console.log('\n📅 Inserting sample group runs...');

    // Get first trail id for sample runs
    const { data: firstTrails } = await supabase.from('trails').select('id').limit(2);
    if (firstTrails && firstTrails.length >= 2) {
        const sampleRuns = [
            {
                trail_id: firstTrails[0].id,
                name: "Marcus's Trail Crew",
                time: '07:30 AM',
                type: 'Steady Pace',
                color: 'text-primary',
                avatar_url: 'https://picsum.photos/seed/group0/100/100',
            },
            {
                trail_id: firstTrails[1].id,
                name: 'Dawn Patrol',
                time: '06:00 AM',
                type: 'Performance',
                color: 'text-[#FF4B4B]',
                avatar_url: 'https://picsum.photos/seed/group1/100/100',
            },
        ];

        const { error: runError } = await supabase.from('group_runs').insert(sampleRuns);
        if (runError) {
            console.error('❌ Error inserting group runs:', runError.message);
        } else {
            console.log('✅ 2 sample group runs added');
        }
    }

    console.log('\n🎉 Seed complete!\n');
}

seed().catch(console.error);
