from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.logging import get_logger
from app.models.race import Race
from app.schemas.race import RaceOut

router = APIRouter(prefix="/api/races", tags=["races"])
logger = get_logger(__name__)


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


@router.get("", response_model=list[RaceOut])
async def get_races(db: AsyncSession = Depends(get_db)):
    """Fetch all races ordered by date."""
    result = await db.execute(select(Race).order_by(Race.date.asc()))
    races = result.scalars().all()
    logger.debug("Fetched races", extra={"count": len(races)})
    return [_map_race(r) for r in races]
