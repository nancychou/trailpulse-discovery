import gzip
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, load_only

from app.database import get_db
from app.logging import get_logger
from app.models.trail import Trail, Hazard, Review
from app.schemas.trail import TrailOut, TrailListOut, TrailNearbyOut, HazardOut, ReviewOut

router = APIRouter(prefix="/api/trails", tags=["trails"])
logger = get_logger(__name__)

# ─── Simple in-memory caches for hot endpoints ──────────────
# Cache pre-compressed gzip bytes to skip both Pydantic serialization AND
# per-request gzip compression. Responses are served with Content-Encoding: gzip
# directly, bypassing the GZipMiddleware entirely.
_list_cache: dict[str, object] = {"gz_bytes": None, "ts": 0.0}
_LIST_CACHE_TTL = 300  # seconds (5 min — trail data rarely changes)

# LRU-style cache for spatial queries (bounds / nearby)
_SPATIAL_CACHE_TTL = 120  # seconds (2 min)
_SPATIAL_CACHE_MAX = 64   # max entries
_spatial_cache: dict[str, tuple[float, bytes]] = {}  # key → (timestamp, gz_bytes)


def _pre_compress(data: bytes) -> bytes:
    """Pre-compress JSON bytes to gzip for zero-copy serving."""
    return gzip.compress(data, compresslevel=6)


def _gzip_response(gz_bytes: bytes, cache_control: str) -> Response:
    """Return a pre-compressed gzip Response that bypasses GZipMiddleware."""
    return Response(
        content=gz_bytes,
        media_type="application/json",
        headers={
            "Content-Encoding": "gzip",
            "Cache-Control": cache_control,
            "Vary": "Accept-Encoding",
        },
    )


def _spatial_cache_get(key: str) -> bytes | None:
    """Return cached gzip bytes if present and fresh, else None."""
    entry = _spatial_cache.get(key)
    if entry and (time.time() - entry[0]) < _SPATIAL_CACHE_TTL:
        return entry[1]
    return None


def _spatial_cache_put(key: str, data: bytes) -> None:
    """Store gzip bytes in the spatial cache, evicting oldest if full."""
    if len(_spatial_cache) >= _SPATIAL_CACHE_MAX:
        oldest_key = min(_spatial_cache, key=lambda k: _spatial_cache[k][0])
        del _spatial_cache[oldest_key]
    _spatial_cache[key] = (time.time(), data)


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

@router.get("/list")
async def get_trails_list(db: AsyncSession = Depends(get_db)):
    """Lightweight list: core fields only, no hazards/reviews. Cached 5 min, pre-gzipped."""
    now = time.time()
    cc = "public, max-age=300, stale-while-revalidate=600"

    if _list_cache["gz_bytes"] is not None and (now - _list_cache["ts"]) < _LIST_CACHE_TTL:
        logger.debug("Serving trails list from cache")
        return _gzip_response(_list_cache["gz_bytes"], cc)

    result = await db.execute(
        select(Trail)
        .where(Trail.distance.isnot(None))
        .where(Trail.elevation.isnot(None))
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
    mapped = [_map_trail_list(t).model_dump() for t in trails]

    # Pre-serialize + pre-compress — zero-copy serving on cache hit
    json_bytes = json.dumps(mapped, separators=(",", ":")).encode()
    gz_bytes = _pre_compress(json_bytes)
    _list_cache["gz_bytes"] = gz_bytes
    _list_cache["ts"] = now
    logger.debug("Fetched trails list from DB", extra={"count": len(mapped)})

    return _gzip_response(gz_bytes, cc)


@router.get("/bounds")
async def get_trails_in_bounds(
    south: float = Query(...),
    west: float = Query(...),
    north: float = Query(...),
    east: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """PostGIS spatial search: trails within map bounding box via GIST index. Cached 2 min."""
    cache_key = f"bounds:{south:.4f},{west:.4f},{north:.4f},{east:.4f}"
    cache_headers = {"Cache-Control": "public, max-age=120, stale-while-revalidate=300"}

    cc = "public, max-age=120, stale-while-revalidate=300"
    cached = _spatial_cache_get(cache_key)
    if cached is not None:
        logger.debug("Serving bounds from cache", extra={"key": cache_key})
        return _gzip_response(cached, cc)

    logger.debug(
        "PostGIS bounds query",
        extra={"south": south, "west": west, "north": north, "east": east},
    )
    result = await db.execute(
        text("""
            SELECT id, name, difficulty, calculated_difficulty, rating, num_votes,
                   distance, elevation, highest_point, trailhead_lat, trailhead_lng,
                   surface, route_type, water_source, image_url, difficulty_score_0_10
            FROM trails
            WHERE geom IS NOT NULL
              AND distance IS NOT NULL
              AND elevation IS NOT NULL
              AND ST_Intersects(
                    geom,
                    ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)::geography
                  )
            ORDER BY difficulty_score_0_10 DESC NULLS LAST
        """),
        {"min_lat": south, "min_lng": west, "max_lat": north, "max_lng": east},
    )
    rows = result.mappings().all()
    logger.debug("PostGIS bounds query returned", extra={"count": len(rows)})

    mapped = [
        TrailListOut(
            id=r["id"],
            name=r["name"],
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
            difficultyScore010=r["difficulty_score_0_10"],
        ).model_dump()
        for r in rows
    ]
    gz_bytes = _pre_compress(json.dumps(mapped, separators=(",", ":")).encode())
    _spatial_cache_put(cache_key, gz_bytes)
    return _gzip_response(gz_bytes, cc)


@router.get("/nearby")
async def get_trails_nearby(
    lat: float = Query(..., description="Latitude of center point"),
    lng: float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(50, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_db),
):
    """PostGIS proximity search: trails within radius, ordered by distance. Cached 2 min."""
    radius_m = radius_km * 1000
    cache_key = f"nearby:{lat:.4f},{lng:.4f},{radius_km:.1f}"
    cc = "public, max-age=120, stale-while-revalidate=300"

    cached = _spatial_cache_get(cache_key)
    if cached is not None:
        logger.debug("Serving nearby from cache", extra={"key": cache_key})
        return _gzip_response(cached, cc)

    logger.debug(
        "PostGIS nearby query",
        extra={"lat": lat, "lng": lng, "radius_km": radius_km},
    )
    result = await db.execute(
        text("""
            SELECT
                t.id, t.name,
                ST_Distance(t.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m,
                t.difficulty, t.calculated_difficulty, t.rating, t.num_votes,
                t.distance, t.elevation, t.highest_point,
                t.trailhead_lat, t.trailhead_lng,
                t.surface, t.route_type, t.water_source, t.image_url,
                t.difficulty_score_0_10
            FROM trails t
            WHERE t.geom IS NOT NULL
              AND t.distance IS NOT NULL
              AND t.elevation IS NOT NULL
              AND ST_DWithin(
                    t.geom,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius_m
                  )
            ORDER BY distance_m
        """),
        {"lat": lat, "lng": lng, "radius_m": radius_m},
    )
    rows = result.mappings().all()
    logger.debug("PostGIS nearby query returned", extra={"count": len(rows)})

    mapped = [
        TrailNearbyOut(
            id=r["id"],
            name=r["name"],
            distanceM=round(r["distance_m"], 1),
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
            difficultyScore010=r["difficulty_score_0_10"],
        ).model_dump()
        for r in rows
    ]
    gz_bytes = _pre_compress(json.dumps(mapped, separators=(",", ":")).encode())
    _spatial_cache_put(cache_key, gz_bytes)
    return _gzip_response(gz_bytes, cc)


@router.get("", response_model=list[TrailOut])
async def get_trails(db: AsyncSession = Depends(get_db)):
    """Fetch all trails with hazards and reviews, ordered by difficulty score."""
    result = await db.execute(
        select(Trail)
        .where(Trail.distance.isnot(None))
        .where(Trail.elevation.isnot(None))
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
