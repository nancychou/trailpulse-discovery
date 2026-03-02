"""Curated trail database with search functionality."""

from typing import List, Optional

TRAIL_DATABASE = [
    {
        "name": "Zion Narrows",
        "location": "Zion National Park, Utah, USA",
        "latitude": 37.2982, "longitude": -112.9477,
        "distance_km": 26, "elevation_gain_m": 200,
        "difficulty": "Moderate", "terrain": "Canyon/River",
        "best_seasons": ["Spring", "Fall"],
        "description": "Iconic slot canyon run along the Virgin River — requires wading through water.",
        "highlights": ["Towering slot canyon walls", "Emerald pools", "Riverside walk"],
        "permits_required": True,
        "tags": ["canyon", "water", "iconic", "utah", "usa"],
    },
    {
        "name": "Tour du Mont Blanc",
        "location": "Alps, France / Italy / Switzerland",
        "latitude": 45.9237, "longitude": 6.8694,
        "distance_km": 170, "elevation_gain_m": 10000,
        "difficulty": "Very Hard", "terrain": "Alpine",
        "best_seasons": ["Summer"],
        "description": "World-famous multi-day circuit around Mont Blanc through three countries.",
        "highlights": ["Mont Blanc massif views", "Alpine meadows", "Historic mountain villages"],
        "permits_required": False,
        "tags": ["alpine", "europe", "multi-day", "iconic", "france", "italy", "switzerland"],
    },
    {
        "name": "Grand Canyon Rim-to-Rim",
        "location": "Grand Canyon National Park, Arizona, USA",
        "latitude": 36.0544, "longitude": -112.1401,
        "distance_km": 34, "elevation_gain_m": 1500,
        "difficulty": "Hard", "terrain": "Canyon",
        "best_seasons": ["Spring", "Fall"],
        "description": "Classic point-to-point through the Grand Canyon. Brutal heat in summer — spring/fall only.",
        "highlights": ["Phantom Ranch at the river", "Colorado River crossing", "Ancient geology"],
        "permits_required": True,
        "tags": ["canyon", "iconic", "arizona", "usa", "permit-required"],
    },
    {
        "name": "Hardrock 100 Course",
        "location": "San Juan Mountains, Colorado, USA",
        "latitude": 37.9783, "longitude": -107.6697,
        "distance_km": 161, "elevation_gain_m": 10000,
        "difficulty": "Extreme", "terrain": "Alpine/Mountain",
        "best_seasons": ["Summer"],
        "description": "One of the world's toughest 100-mile courses. Average elevation over 3,600 m.",
        "highlights": ["14er summits", "Victorian mining history", "Remote wilderness"],
        "permits_required": True,
        "tags": ["ultramarathon", "alpine", "extreme", "100-mile", "colorado", "usa"],
    },
    {
        "name": "Western States 100 Course",
        "location": "Sierra Nevada, California, USA",
        "latitude": 39.1879, "longitude": -120.2359,
        "distance_km": 161, "elevation_gain_m": 5500,
        "difficulty": "Extreme", "terrain": "Forest/Mountain",
        "best_seasons": ["Summer"],
        "description": "World's oldest and most prestigious 100-mile trail race from Squaw Valley to Auburn.",
        "highlights": ["Sierra Nevada snowfields", "American River Canyon", "Robie Point finish"],
        "permits_required": False,
        "tags": ["ultramarathon", "100-mile", "california", "usa", "iconic"],
    },
    {
        "name": "Cinque Terre Coastal Trail",
        "location": "Liguria, Italy",
        "latitude": 44.1461, "longitude": 9.6439,
        "distance_km": 12, "elevation_gain_m": 800,
        "difficulty": "Moderate", "terrain": "Coastal/Mediterranean",
        "best_seasons": ["Spring", "Fall"],
        "description": "Stunning coastal singletrack connecting five colourful villages above the Ligurian Sea.",
        "highlights": ["Mediterranean views", "Vineyard terraces", "Colourful village architecture"],
        "permits_required": True,
        "tags": ["coastal", "europe", "italy", "scenic", "villages", "short"],
    },
    {
        "name": "Kepler Track",
        "location": "Fiordland National Park, New Zealand",
        "latitude": -45.4165, "longitude": 167.7197,
        "distance_km": 60, "elevation_gain_m": 1700,
        "difficulty": "Hard", "terrain": "Alpine/Forest/Lake",
        "best_seasons": ["Summer", "Autumn"],
        "description": "One of New Zealand's Great Walks — epic alpine ridge with ancient beech forest and lake views.",
        "highlights": ["Fiordland panoramas", "Beech forest tunnels", "Lake Te Anau"],
        "permits_required": True,
        "tags": ["new zealand", "great walk", "alpine", "forest", "lake", "southern hemisphere"],
    },
    {
        "name": "Trolltunga Trail",
        "location": "Hardangerfjord, Norway",
        "latitude": 60.1244, "longitude": 6.7400,
        "distance_km": 27, "elevation_gain_m": 860,
        "difficulty": "Hard", "terrain": "Mountain/Plateau",
        "best_seasons": ["Summer"],
        "description": "Norway's most dramatic viewpoint — a rock ledge jutting 700 m above Lake Ringedalsvatnet.",
        "highlights": ["Trolltunga rock ledge", "Fjord panorama", "Norwegian plateau wilderness"],
        "permits_required": False,
        "tags": ["norway", "europe", "mountain", "iconic", "fjord", "scandinavia"],
    },
    {
        "name": "Dolomites Alta Via 1",
        "location": "Dolomites, Italy",
        "latitude": 46.6157, "longitude": 12.2060,
        "distance_km": 120, "elevation_gain_m": 6500,
        "difficulty": "Very Hard", "terrain": "Alpine/Dolomite",
        "best_seasons": ["Summer"],
        "description": "Classic high-level traverse through the UNESCO Dolomite towers from Lago di Braies to Belluno.",
        "highlights": ["Dolomite spires at sunset", "Alpine hut hospitality", "Lagazuoi cablecar bypass"],
        "permits_required": False,
        "tags": ["italy", "europe", "alpine", "dolomites", "multi-day", "iconic"],
    },
    {
        "name": "Snowdon Horseshoe",
        "location": "Snowdonia, Wales, UK",
        "latitude": 53.0685, "longitude": -4.0763,
        "distance_km": 11, "elevation_gain_m": 1050,
        "difficulty": "Hard", "terrain": "Mountain/Ridge",
        "best_seasons": ["Spring", "Summer", "Autumn"],
        "description": "Wales' finest ridge run over Crib Goch and Snowdon — exposed scrambling on the knife-edge arête.",
        "highlights": ["Crib Goch knife-edge", "Snowdon summit (1085 m)", "Glaslyn lake"],
        "permits_required": False,
        "tags": ["wales", "uk", "mountain", "ridge", "europe", "scramble", "short"],
    },
    {
        "name": "Chamonix to Zermatt (Haute Route)",
        "location": "Alps, France / Switzerland",
        "latitude": 45.9237, "longitude": 7.7491,
        "distance_km": 180, "elevation_gain_m": 12000,
        "difficulty": "Very Hard", "terrain": "Alpine/Glacier",
        "best_seasons": ["Summer"],
        "description": "The ultimate Alps traverse linking Chamonix with Zermatt beneath the Matterhorn.",
        "highlights": ["Mont Blanc view", "Matterhorn close-up", "Glacier approach sections"],
        "permits_required": False,
        "tags": ["alpine", "europe", "multi-day", "glacier", "france", "switzerland", "iconic"],
    },
    {
        "name": "John Muir Trail",
        "location": "Sierra Nevada, California, USA",
        "latitude": 37.7296, "longitude": -119.2957,
        "distance_km": 340, "elevation_gain_m": 13000,
        "difficulty": "Extreme", "terrain": "Alpine/Mountain",
        "best_seasons": ["Summer"],
        "description": "High-altitude traverse of the Sierra Nevada from Yosemite Valley to Mt. Whitney.",
        "highlights": ["Mt. Whitney (4421 m)", "Yosemite Valley start", "Pristine alpine lakes"],
        "permits_required": True,
        "tags": ["thru-hike", "california", "usa", "alpine", "multi-day", "iconic", "wilderness"],
    },
    {
        "name": "Inca Trail to Machu Picchu",
        "location": "Cusco Region, Peru",
        "latitude": -13.1631, "longitude": -72.5450,
        "distance_km": 43, "elevation_gain_m": 1200,
        "difficulty": "Hard", "terrain": "Mountain/Jungle/Archaeological",
        "best_seasons": ["Dry Season (May–October)"],
        "description": "Ancient Inca route through cloud forest and mountain passes to the Sun Gate above Machu Picchu.",
        "highlights": ["Dead Woman's Pass (4215 m)", "Inca ruins en route", "Sun Gate sunrise over Machu Picchu"],
        "permits_required": True,
        "tags": ["peru", "south america", "archaeological", "altitude", "iconic", "guided"],
    },
    {
        "name": "Skyline Trail, Mt. Rainier",
        "location": "Mt. Rainier National Park, Washington, USA",
        "latitude": 46.8523, "longitude": -121.7603,
        "distance_km": 13, "elevation_gain_m": 550,
        "difficulty": "Moderate", "terrain": "Alpine/Volcanic",
        "best_seasons": ["Summer"],
        "description": "Classic loop above Paradise with glacier views, wildflower meadows, and Rainier summit looming overhead.",
        "highlights": ["Panorama Point views", "Nisqually Glacier", "Subalpine wildflowers"],
        "permits_required": False,
        "tags": ["washington", "usa", "alpine", "volcano", "short", "wildflowers"],
    },
    {
        "name": "Laugavegur Trail",
        "location": "Highlands, Iceland",
        "latitude": 63.9823, "longitude": -19.0497,
        "distance_km": 55, "elevation_gain_m": 1200,
        "difficulty": "Hard", "terrain": "Volcanic/Highland/River",
        "best_seasons": ["Summer"],
        "description": "Iceland's most famous multi-day trail through geothermal fields, obsidian deserts, and glacial rivers.",
        "highlights": ["Landmannalaugar hot springs", "Þórsmörk valley", "River crossings"],
        "permits_required": True,
        "tags": ["iceland", "europe", "volcanic", "multi-day", "river", "geothermal"],
    },
]


def search_trails(
    location: str = None,
    difficulty: str = None,
    max_distance_km: float = None,
    min_distance_km: float = None,
    terrain_type: str = None,
    tags: List[str] = None,
    limit: int = 5,
) -> dict:
    """Search the curated trail database by various criteria.

    Args:
        location: Region, country, or trail name keyword.
        difficulty: 'Easy', 'Moderate', 'Hard', 'Very Hard', or 'Extreme'.
        max_distance_km: Upper distance bound in km.
        min_distance_km: Lower distance bound in km.
        terrain_type: Terrain keyword (e.g. 'Alpine', 'Canyon', 'Coastal').
        tags: List of tag keywords to filter by.
        limit: Max results to return (default 5).

    Returns:
        Dict with total_found count and list of matching trails.
    """
    results = TRAIL_DATABASE.copy()

    if difficulty:
        dl = difficulty.lower()
        results = [t for t in results if t["difficulty"].lower() == dl]

    if max_distance_km is not None:
        results = [t for t in results if t["distance_km"] <= max_distance_km]

    if min_distance_km is not None:
        results = [t for t in results if t["distance_km"] >= min_distance_km]

    if terrain_type:
        tl = terrain_type.lower()
        results = [t for t in results if tl in t["terrain"].lower()]

    if location:
        ll = location.lower()
        results = [
            t for t in results
            if ll in t["location"].lower()
            or ll in t["name"].lower()
            or any(ll in tag for tag in t["tags"])
        ]

    if tags:
        for tag in tags:
            tl = tag.lower()
            results = [t for t in results if any(tl in tt for tt in t["tags"])]

    return {
        "total_found": len(results),
        "trails": results[:limit],
    }
