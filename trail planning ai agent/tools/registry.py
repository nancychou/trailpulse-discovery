"""Tool registry — defines Anthropic tool schemas and dispatches calls."""

from .weather import get_weather
from .geocoding import search_location
from .elevation import get_elevation
from .calculator import calculate_run_stats
from .trails import search_trails
from .memory import remember, recall, forget
from .thinking import think

TOOL_DEFINITIONS = [
    {
        "name": "search_location",
        "description": (
            "Geocode a place name to latitude/longitude coordinates. "
            "Use this when you need coordinates for a city, trail area, or region "
            "before calling weather or elevation tools."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Place name to look up (e.g. 'Chamonix, France', 'Zion National Park', 'Boulder, Colorado').",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_weather",
        "description": (
            "Get daily weather conditions for a specific location and date. "
            "Returns temperature, precipitation, wind speed, and a trail-running suitability assessment."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Latitude of the location."},
                "longitude": {"type": "number", "description": "Longitude of the location."},
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Defaults to today. Forecast up to 16 days ahead; historical up to 60 days back.",
                },
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "get_elevation",
        "description": "Get terrain elevation (metres and feet) at a specific GPS coordinate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Latitude of the point."},
                "longitude": {"type": "number", "description": "Longitude of the point."},
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "calculate_run_stats",
        "description": (
            "Calculate trail run statistics using Naismith's Rule: "
            "estimated finish time, difficulty rating, calorie burn, water needs, and average pace. "
            "Adjust for the runner's fitness level."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "distance_km": {"type": "number", "description": "Total route distance in kilometres."},
                "elevation_gain_m": {"type": "number", "description": "Total cumulative ascent in metres."},
                "elevation_loss_m": {
                    "type": "number",
                    "description": "Total cumulative descent in metres. Defaults to same as gain (symmetric route).",
                },
                "pace_min_per_km": {
                    "type": "number",
                    "description": "Runner's flat road pace in min/km (e.g. 5.5 for 5:30/km). Optional.",
                },
                "fitness_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced", "elite"],
                    "description": "Runner's trail fitness level.",
                },
            },
            "required": ["distance_km", "elevation_gain_m"],
        },
    },
    {
        "name": "search_trails",
        "description": (
            "Search the curated trail database for routes matching criteria. "
            "Returns trail details: distance, elevation, difficulty, terrain, best seasons, highlights, and permit info. "
            "Use this to recommend specific trails."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "Region, country, or keyword to filter by (e.g. 'Alps', 'New Zealand', 'Utah').",
                },
                "difficulty": {
                    "type": "string",
                    "enum": ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"],
                    "description": "Exact difficulty level to filter by.",
                },
                "max_distance_km": {"type": "number", "description": "Maximum trail length in km."},
                "min_distance_km": {"type": "number", "description": "Minimum trail length in km."},
                "terrain_type": {
                    "type": "string",
                    "description": "Terrain keyword to match (e.g. 'Alpine', 'Canyon', 'Coastal', 'Forest').",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tag keywords to filter by (e.g. ['multi-day', 'europe']).",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max number of results (default 5).",
                },
            },
        },
    },
    # ── Agent-level tools ──────────────────────────────────────────────────────
    {
        "name": "think",
        "description": (
            "Your private reasoning scratchpad. Call this BEFORE taking action on any "
            "multi-step or ambiguous request. Use it to plan which tools to call, in what "
            "order, and what information you still need. The user does not see this output."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reasoning": {
                    "type": "string",
                    "description": "Your step-by-step thinking about how to approach this request.",
                }
            },
            "required": ["reasoning"],
        },
    },
    {
        "name": "remember",
        "description": (
            "Persist a fact about the user to long-term memory. "
            "Call this whenever the user reveals their fitness level, home city, goals, "
            "gear preferences, past runs, or any other reusable personal info. "
            "Categories: 'profile', 'preferences', 'history', 'goals'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["profile", "preferences", "history", "goals"],
                    "description": "Memory category.",
                },
                "key": {
                    "type": "string",
                    "description": "Short label, e.g. 'fitness_level', 'home_city', 'goal_race'.",
                },
                "value": {
                    "type": "string",
                    "description": "Value to store, e.g. 'advanced', 'Seattle, WA', 'UTMB 2026'.",
                },
            },
            "required": ["category", "key", "value"],
        },
    },
    {
        "name": "recall",
        "description": (
            "Retrieve facts previously stored about the user. "
            "Call this at the START of every new conversation to personalise your responses. "
            "Optionally filter by category: 'profile', 'preferences', 'history', 'goals'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["profile", "preferences", "history", "goals"],
                    "description": "Filter to a specific category, or omit to retrieve all memories.",
                }
            },
        },
    },
    {
        "name": "forget",
        "description": "Delete a specific memory entry (e.g. an outdated goal or incorrect fact).",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Category of the memory to delete."},
                "key": {"type": "string", "description": "Key of the memory to delete."},
            },
            "required": ["category", "key"],
        },
    },
]

_TOOL_FN_MAP = {
    "search_location": search_location,
    "get_weather": get_weather,
    "get_elevation": get_elevation,
    "calculate_run_stats": calculate_run_stats,
    "search_trails": search_trails,
    "remember": remember,
    "recall": recall,
    "forget": forget,
    "think": think,
}


def get_tools() -> list:
    return TOOL_DEFINITIONS


def execute_tool(name: str, inputs: dict) -> dict:
    fn = _TOOL_FN_MAP.get(name)
    if fn is None:
        return {"error": f"Unknown tool: '{name}'"}
    try:
        return fn(**inputs)
    except TypeError as e:
        return {"error": f"Invalid arguments for '{name}': {e}"}
    except Exception as e:
        return {"error": f"Tool '{name}' failed: {e}"}
