import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, load_only

from app.database import get_db
from app.logging import get_logger
from app.models.trail import Trail, Hazard, Review
from app.schemas.trail import TrailOut, TrailListOut, HazardOut, ReviewOut

router = APIRouter(prefix="/api/trails", tags=["trails"])
logger = get_logger(__name__)

# ─── Simple in-memory cache for the list endpoint ────────────
_list_cache: dict[str, object] = {"data": None, "ts": 0.0}
_LIST_CACHE_TTL = 60  # seconds


def _map_trail_list(trail: Trail) -> TrailListOut:
    """Map a SQLAlchemy Trail to the lightweight list schema."""
    return TrailListOut(
        id=trail.id,
        name=trail.name,
        difficulty=trail.difficulty,
        calculatedDifficulty=trail.calculated_difficulty,
        rating=trail.rating,
        numVotes=trail.num_votes,
        distance=trail.distance,
        elevation=trail.elevation,
        highestPoint=trail.highest_point,
        trailheadLat=trail.trailhead_lat,
        trailheadLng=trail.trailhead_lng,
        surface=trail.surface,
        routeType=trail.route_type,
        waterSource=trail.water_source,
        imageUrl=trail.image_url,
        difficultyScore010=trail.difficulty_score_0_10,
    )


def _map_trail(trail: Trail) -> TrailOut:
    """Map a SQLAlchemy Trail (with loaded hazards/reviews) to Pydantic output."""
    return TrailOut(
        id=trail.id,
        name=trail.name,
        rank=trail.rank,
        difficulty=trail.difficulty,
        calculatedDifficulty=trail.calculated_difficulty,
        rating=trail.rating,
        numVotes=trail.num_votes,
        distance=trail.distance,
        elevation=trail.elevation,
        highestPoint=trail.highest_point,
        trailheadLat=trail.trailhead_lat,
        trailheadLng=trail.trailhead_lng,
        surface=trail.surface,
        routeType=trail.route_type,
        waterSource=trail.water_source,
        imageUrl=trail.image_url,
        parkingTags=trail.parking_tags or [],
        parkingStatus=trail.parking_status,
        restrooms=trail.restrooms,
        cellCoverage=trail.cell_coverage,
        crowdLevel=trail.crowd_level,
        sourceUrl=trail.source_url,
        osmId=trail.osm_id,
        osmName=trail.osm_name,
        matchConfidence=trail.match_confidence,
        maxGradeP95=trail.max_grade_p95,
        surfacePrimary=trail.surface_primary,
        surfaceBreakdown=trail.surface_breakdown,
        distanceMi=trail.distance_mi,
        surfacePenalty=trail.surface_penalty,
        wtaDiffLevel=trail.wta_diff_level,
        difficultyScore010=trail.difficulty_score_0_10,
        hazards=[
            HazardOut(type=h.type, message=h.message, date=h.date or "")
            for h in (trail.hazards or [])
        ],
        reviews=[
            ReviewOut(
                user=r.user_name,
                avatar=r.avatar_url or "",
                rating=r.rating or 0,
                date=r.date or "",
                text=r.text or "",
            )
            for r in (trail.reviews or [])
        ],
    )


# ─── Static routes MUST come before /{trail_id} ──────────────

@router.get("/list", response_model=list[TrailListOut])
async def get_trails_list(response: Response, db: AsyncSession = Depends(get_db)):
    """Lightweight list: core fields only, no hazards/reviews. Cached for 60s."""
    now = time.time()

    if _list_cache["data"] is not None and (now - _list_cache["ts"]) < _LIST_CACHE_TTL:
        logger.debug("Serving trails list from cache")
        response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return _list_cache["data"]

    result = await db.execute(
        select(Trail)
        .options(
            load_only(
                Trail.id, Trail.name, Trail.difficulty, Trail.calculated_difficulty,
                Trail.rating, Trail.num_votes, Trail.distance, Trail.elevation,
                Trail.highest_point, Trail.trailhead_lat, Trail.trailhead_lng,
                Trail.surface, Trail.route_type, Trail.water_source,
                Trail.image_url, Trail.difficulty_score_0_10,
            )
        )
        .order_by(Trail.difficulty_score_0_10.desc().nulls_last())
    )
    trails = result.scalars().all()
    mapped = [_map_trail_list(t) for t in trails]

    _list_cache["data"] = mapped
    _list_cache["ts"] = now
    logger.debug("Fetched trails list from DB", extra={"count": len(mapped)})

    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return mapped


@router.get("/bounds", response_model=list[TrailOut])
async def get_trails_in_bounds(
    south: float = Query(...),
    west: float = Query(...),
    north: float = Query(...),
    east: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Spatial search: fetch trails within map bounds using lat/lng filtering."""
    logger.debug(
        "Bounds query",
        extra={"south": south, "west": west, "north": north, "east": east},
    )
    result = await db.execute(
        text("""
            SELECT * FROM trails
            WHERE trailhead_lat IS NOT NULL
            AND trailhead_lng IS NOT NULL
            AND trailhead_lat >= :min_lat
            AND trailhead_lat <= :max_lat
            AND trailhead_lng >= :min_lng
            AND trailhead_lng <= :max_lng
            ORDER BY difficulty_score_0_10 DESC NULLS LAST
        """),
        {"min_lat": south, "min_lng": west, "max_lat": north, "max_lng": east},
    )
    rows = result.mappings().all()
    logger.debug("Bounds query returned", extra={"count": len(rows)})

    return [
        TrailOut(
            id=r["id"],
            name=r["name"],
            rank=r["rank"],
            difficulty=r["difficulty"],
            calculatedDifficulty=r["calculated_difficulty"],
            rating=r["rating"],
            numVotes=r["num_votes"],
            distance=r["distance"],
            elevation=r["elevation"],
            highestPoint=r["highest_point"],
            trailheadLat=r["trailhead_lat"],
            trailheadLng=r["trailhead_lng"],
            surface=r["surface"],
            routeType=r["route_type"],
            waterSource=r["water_source"],
            imageUrl=r["image_url"],
            parkingTags=r["parking_tags"] or [],
            parkingStatus=r["parking_status"],
            restrooms=r["restrooms"],
            cellCoverage=r["cell_coverage"],
            crowdLevel=r["crowd_level"],
            sourceUrl=r["source_url"],
            osmId=r["osm_id"],
            osmName=r["osm_name"],
            matchConfidence=r["match_confidence"],
            maxGradeP95=r["max_grade_p95"],
            surfacePrimary=r["surface_primary"],
            surfaceBreakdown=r["surface_breakdown"],
            distanceMi=r["distance_mi"],
            surfacePenalty=r["surface_penalty"],
            wtaDiffLevel=r["wta_diff_level"],
            difficultyScore010=r["difficulty_score_0_10"],
            hazards=[],
            reviews=[],
        )
        for r in rows
    ]


@router.get("", response_model=list[TrailOut])
async def get_trails(db: AsyncSession = Depends(get_db)):
    """Fetch all trails with hazards and reviews, ordered by difficulty score."""
    result = await db.execute(
        select(Trail)
        .options(selectinload(Trail.hazards), selectinload(Trail.reviews))
        .order_by(Trail.difficulty_score_0_10.desc().nulls_last())
    )
    trails = result.scalars().all()
    logger.debug("Fetched all trails", extra={"count": len(trails)})
    return [_map_trail(t) for t in trails]


# ─── Dynamic route MUST come after static routes ─────────────

@router.get("/{trail_id}", response_model=TrailOut)
async def get_trail_by_id(trail_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single trail with hazards and reviews."""
    result = await db.execute(
        select(Trail)
        .options(selectinload(Trail.hazards), selectinload(Trail.reviews))
        .where(Trail.id == trail_id)
    )
    trail = result.scalars().first()
    if trail is None:
        raise HTTPException(status_code=404, detail="Trail not found")
    logger.debug("Fetched trail detail", extra={"trail_id": trail_id})
    return _map_trail(trail)
