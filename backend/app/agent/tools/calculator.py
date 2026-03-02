"""Trail run statistics calculator — pure computation, no external API needed."""

from typing import Optional


def calculate_run_stats(
    distance_km: float,
    elevation_gain_m: float,
    elevation_loss_m: Optional[float] = None,
    pace_min_per_km: Optional[float] = None,
    fitness_level: str = "intermediate",
) -> dict:
    """Calculate trail run statistics using Naismith's Rule with fitness adjustments.

    Args:
        distance_km: Total route distance in kilometres.
        elevation_gain_m: Total cumulative ascent in metres.
        elevation_loss_m: Total cumulative descent in metres (defaults to equal gain).
        pace_min_per_km: Runner's road pace in min/km (optional — used for flat time base).
        fitness_level: One of 'beginner', 'intermediate', 'advanced', 'elite'.

    Returns:
        Dict with time estimate, difficulty, calories, water needs, and pace.
    """
    if distance_km <= 0:
        return {"error": "distance_km must be greater than 0"}

    if elevation_loss_m is None:
        elevation_loss_m = elevation_gain_m  # assume symmetric out-and-back

    fitness_factors = {
        "beginner": 1.40,
        "intermediate": 1.00,
        "advanced": 0.78,
        "elite": 0.62,
    }
    factor = fitness_factors.get(fitness_level.lower(), 1.00)

    # Naismith's Rule: 1 hr per 5 km horizontal + 1 hr per 600 m ascent
    if pace_min_per_km:
        flat_hours = (distance_km * pace_min_per_km) / 60.0
    else:
        flat_hours = distance_km / 5.0

    ascent_hours = elevation_gain_m / 600.0
    descent_hours = elevation_loss_m / 1500.0  # descending is faster

    total_hours = (flat_hours + ascent_hours + descent_hours) * factor
    total_minutes = total_hours * 60

    h = int(total_minutes // 60)
    m = int(total_minutes % 60)

    # Difficulty score (Skyrunner-inspired composite)
    difficulty_score = distance_km + (elevation_gain_m / 100.0)
    if difficulty_score < 15:
        difficulty = "Easy"
    elif difficulty_score < 30:
        difficulty = "Moderate"
    elif difficulty_score < 50:
        difficulty = "Hard"
    elif difficulty_score < 80:
        difficulty = "Very Hard"
    else:
        difficulty = "Extreme"

    # Calorie estimate (~65 kcal/km base + elevation penalty)
    kcal_per_km = 65 + (elevation_gain_m / distance_km) * 0.08
    calories = int(kcal_per_km * distance_km)

    # Hydration: ~500 ml/hr baseline; increase for heat
    water_l = round(total_hours * 0.5, 1)

    # Average moving pace
    avg_pace_total = total_minutes / distance_km
    avg_pace_m = int(avg_pace_total)
    avg_pace_s = int((avg_pace_total - avg_pace_m) * 60)

    return {
        "distance_km": round(distance_km, 1),
        "distance_miles": round(distance_km * 0.621371, 1),
        "elevation_gain_m": round(elevation_gain_m),
        "elevation_gain_ft": round(elevation_gain_m * 3.28084),
        "elevation_loss_m": round(elevation_loss_m),
        "elevation_loss_ft": round(elevation_loss_m * 3.28084),
        "estimated_time": f"{h}h {m:02d}m",
        "estimated_calories": calories,
        "difficulty": difficulty,
        "water_needed_liters": water_l,
        "fitness_level_used": fitness_level,
        "average_trail_pace": f"{avg_pace_m}:{avg_pace_s:02d} min/km",
    }
