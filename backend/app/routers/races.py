import gzip
import json
import time

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.logging import get_logger
from app.models.race import Race
from app.schemas.race import RaceOut, RaceStatsOut

router = APIRouter(prefix="/api/races", tags=["races"])
logger = get_logger(__name__)

# ─── In-memory cache for race stats (pre-compressed) ─────────
_stats_cache: dict[str, object] = {"gz_bytes": None, "ts": 0.0}
_STATS_CACHE_TTL = 300  # 5 min — race data rarely changes


def _map_race(row: Race) -> RaceOut:
    return RaceOut(
        id=row.id,
        name=row.name,
        location=row.location or "",
        country=row.country or "",
        date=row.date or "",
        type=row.type or "",
        distance=row.distance or "",
        distanceKm=row.distance_km or 0,
        elevation=row.elevation or "",
        rating=row.rating or 0,
        difficultyRank=row.difficulty_rank or 0,
        reviewCount=row.review_count or "",
        imageUrl=row.image_url or "",
        qualifiers=row.qualifiers or [],
    )


# ─── Static routes MUST come before any dynamic routes ───────

@router.get("/stats")
async def get_race_stats(db: AsyncSession = Depends(get_db)):
    """Race aggregation: statistics grouped by country. Cached 5 min, pre-gzipped."""
    now = time.time()
    cc = "public, max-age=300, stale-while-revalidate=600"

    if _stats_cache["gz_bytes"] is not None and (now - _stats_cache["ts"]) < _STATS_CACHE_TTL:
        logger.debug("Serving race stats from cache")
        return Response(
            content=_stats_cache["gz_bytes"],
            media_type="application/json",
            headers={"Content-Encoding": "gzip", "Cache-Control": cc, "Vary": "Accept-Encoding"},
        )

    result = await db.execute(text("SELECT * FROM race_stats"))
    rows = result.mappings().all()
    logger.debug("Fetched race stats", extra={"count": len(rows)})

    mapped = [
        RaceStatsOut(
            country=r["country"],
            raceCount=r["race_count"],
            avgDistanceKm=float(r["avg_distance_km"] or 0),
            minDistanceKm=float(r["min_distance_km"] or 0),
            maxDistanceKm=float(r["max_distance_km"] or 0),
            avgRating=float(r["avg_rating"] or 0),
            avgDifficulty=float(r["avg_difficulty"] or 0),
            qualifiers=r["all_qualifiers"] or [],
        ).model_dump()
        for r in rows
    ]
    json_bytes = json.dumps(mapped, separators=(",", ":")).encode()
    gz_bytes = gzip.compress(json_bytes, compresslevel=6)
    _stats_cache["gz_bytes"] = gz_bytes
    _stats_cache["ts"] = now
    return Response(
        content=gz_bytes,
        media_type="application/json",
        headers={"Content-Encoding": "gzip", "Cache-Control": cc, "Vary": "Accept-Encoding"},
    )


@router.get("", response_model=list[RaceOut])
async def get_races(db: AsyncSession = Depends(get_db)):
    """Fetch all races ordered by date."""
    result = await db.execute(select(Race).order_by(Race.date.asc()))
    races = result.scalars().all()
    logger.debug("Fetched races", extra={"count": len(races)})
    return [_map_race(r) for r in races]
