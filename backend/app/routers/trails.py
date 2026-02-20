from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.trail import Trail, Hazard, Review
from app.schemas.trail import TrailOut, HazardOut, ReviewOut

router = APIRouter(prefix="/api/trails", tags=["trails"])


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
        gradeP95=trail.grade_p95,
        surfacePenalty=trail.surface_penalty,
        logDistance=trail.log_distance,
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


@router.get("", response_model=list[TrailOut])
async def get_trails(db: AsyncSession = Depends(get_db)):
    """Fetch all trails with hazards and reviews, ordered by difficulty score."""
    result = await db.execute(
        select(Trail)
        .options(selectinload(Trail.hazards), selectinload(Trail.reviews))
        .order_by(Trail.difficulty_score_0_10.desc().nulls_last())
    )
    trails = result.scalars().all()
    return [_map_trail(t) for t in trails]


@router.get("/bounds", response_model=list[TrailOut])
async def get_trails_in_bounds(
    south: float = Query(...),
    west: float = Query(...),
    north: float = Query(...),
    east: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Spatial search: fetch trails within map bounds using lat/lng filtering."""
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
            gradeP95=r["grade_p95"],
            surfacePenalty=r["surface_penalty"],
            logDistance=r["log_distance"],
            wtaDiffLevel=r["wta_diff_level"],
            difficultyScore010=r["difficulty_score_0_10"],
            hazards=[],
            reviews=[],
        )
        for r in rows
    ]
