import httpx
from fastapi import APIRouter, HTTPException
from app.config import settings

router = APIRouter(prefix="/api/weather", tags=["weather"])

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

WEATHER_PROMPT = (
    "What is the current weather temperature and general trail condition summary "
    "for Seattle/North Bend, WA area? "
    "Return exactly one short sentence (e.g., 'Overcast / 54°F - Conditions damp but stable')."
)


@router.get("")
async def get_weather():
    """
    Proxy Gemini API call server-side so the API key is never exposed in the browser.
    Uses Google Search grounding for real-time weather data.
    """
    if not settings.GEMINI_API_KEY:
        return {"text": "Optimal / 65°F", "source": None}

    payload = {
        "contents": [{"parts": [{"text": WEATHER_PROMPT}]}],
        "tools": [{"google_search": {}}],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return {"text": "Optimal / 65°F", "source": None}

        candidate = candidates[0]
        parts = candidate.get("content", {}).get("parts", [])
        text = parts[0].get("text", "Optimal / 65°F").strip() if parts else "Optimal / 65°F"

        # Extract grounding source URL for citation compliance
        grounding_chunks = (
            candidate.get("groundingMetadata", {})
            .get("groundingChunks", [])
        )
        source = grounding_chunks[0].get("web", {}).get("uri") if grounding_chunks else None

        return {"text": text, "source": source}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.status_code}")
    except Exception:
        # Graceful degradation — never crash the app over weather
        return {"text": "Optimal / 65°F", "source": None}
