"""Elevation tool using Open-Topo-Data SRTM30m (free, no API key required)."""

import requests


def get_elevation(latitude: float, longitude: float) -> dict:
    """Get the terrain elevation at a specific coordinate.

    Args:
        latitude: Latitude of the point.
        longitude: Longitude of the point.

    Returns:
        Dict with elevation in metres and feet.
    """
    url = "https://api.opentopodata.org/v1/srtm30m"
    params = {"locations": f"{latitude},{longitude}"}

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return {"error": f"Elevation API request failed: {e}"}

    if data.get("status") != "OK" or not data.get("results"):
        return {"error": "No elevation data returned."}

    elev_m = data["results"][0].get("elevation")
    if elev_m is None:
        return {"error": "Elevation value is null (possibly ocean or data gap)."}

    return {
        "latitude": latitude,
        "longitude": longitude,
        "elevation_m": round(elev_m, 1),
        "elevation_ft": round(elev_m * 3.28084, 1),
    }
