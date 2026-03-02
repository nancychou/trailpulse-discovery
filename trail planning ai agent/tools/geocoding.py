"""Geocoding tool using Nominatim / OpenStreetMap (free, no API key required)."""

import requests


def search_location(query: str) -> dict:
    """Geocode a place name to latitude/longitude coordinates.

    Args:
        query: Place name, trail name, city, or region to look up.

    Returns:
        Dict with name, latitude, longitude, country, and place type.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    headers = {"User-Agent": "TrailPlanningAI/1.0 (educational project)"}

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        results = resp.json()
    except requests.RequestException as e:
        return {"error": f"Geocoding request failed: {e}"}

    if not results:
        return {"error": f"Location not found: '{query}'. Try a more specific name."}

    r = results[0]
    address = r.get("address", {})

    return {
        "name": r.get("display_name", query),
        "latitude": float(r["lat"]),
        "longitude": float(r["lon"]),
        "type": r.get("type", "unknown"),
        "country": address.get("country", "Unknown"),
        "state": address.get("state", address.get("region", "")),
    }
