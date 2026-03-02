"""Weather tool using Open-Meteo API (free, no API key required)."""

import requests
from datetime import datetime

WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
}


def _assess_running_conditions(weather_code: int, temp_max: float, precip: float, wind_kmh: float) -> str:
    if weather_code in (95, 96, 99):
        return "Dangerous — Thunderstorm. Do not run."

    issues = []
    if weather_code in (71, 73, 75, 77, 85, 86):
        issues.append("snow on trail")
    elif weather_code in (65, 82):
        issues.append("heavy rain")
    elif weather_code in (61, 63, 80, 81):
        issues.append("rain")

    if temp_max is not None:
        if temp_max > 35:
            issues.append("extreme heat")
        elif temp_max > 28:
            issues.append("high heat — hydrate extra")
        elif temp_max < 0:
            issues.append("freezing temps — ice risk")

    if wind_kmh > 60:
        issues.append("dangerous winds")
    elif wind_kmh > 40:
        issues.append("strong winds")

    if precip > 20:
        issues.append("heavy precipitation")

    if not issues:
        if temp_max is not None and 8 <= temp_max <= 22:
            return "Excellent"
        elif temp_max is not None and 2 <= temp_max <= 28:
            return "Good"
        return "Acceptable"

    rating = "Poor" if len(issues) >= 2 or any(w in " ".join(issues) for w in ("extreme", "heavy", "dangerous", "snow")) else "Fair"
    return f"{rating} — {', '.join(issues).capitalize()}"


def get_weather(latitude: float, longitude: float, date: str = None) -> dict:
    """Get daily weather forecast or historical data for trail planning.

    Args:
        latitude: Location latitude.
        longitude: Location longitude.
        date: Date in YYYY-MM-DD format (defaults to today).

    Returns:
        Weather data dict with condition, temps, precipitation, wind, and running assessment.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        target = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days_diff = (target - today).days

    if days_diff > 16:
        return {"error": f"Cannot forecast more than 16 days ahead. '{date}' is {days_diff} days away."}
    if days_diff < -60:
        return {"error": f"Historical data only available within the last 60 days."}

    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        if days_diff < 0
        else "https://api.open-meteo.com/v1/forecast"
    )

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "windspeed_10m_max",
            "weathercode",
        ],
        "timezone": "auto",
        "start_date": date,
        "end_date": date,
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return {"error": f"Weather API request failed: {e}"}

    daily = data.get("daily", {})
    if not daily or not daily.get("time"):
        return {"error": "No weather data returned for this location/date."}

    def first(key, default=None):
        vals = daily.get(key, [default])
        return vals[0] if vals else default

    weather_code = first("weathercode", 0) or 0
    temp_max = first("temperature_2m_max")
    temp_min = first("temperature_2m_min")
    precip = first("precipitation_sum", 0) or 0
    wind_max = first("windspeed_10m_max", 0) or 0

    return {
        "date": date,
        "condition": WMO_CODES.get(weather_code, "Unknown"),
        "temperature_max_c": temp_max,
        "temperature_min_c": temp_min,
        "temperature_max_f": round(temp_max * 9 / 5 + 32, 1) if temp_max is not None else None,
        "temperature_min_f": round(temp_min * 9 / 5 + 32, 1) if temp_min is not None else None,
        "precipitation_mm": round(precip, 1),
        "wind_speed_max_kmh": round(wind_max, 1),
        "running_assessment": _assess_running_conditions(weather_code, temp_max, precip, wind_max),
    }
