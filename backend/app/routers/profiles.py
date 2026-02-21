from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies import get_current_user
from app.logging import get_logger
from app.models.profile import Profile
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/api/profiles", tags=["profiles"])
logger = get_logger(__name__)


def _map_profile(p: Profile) -> ProfileOut:
    return ProfileOut(
        id=p.id,
        email=p.email or "",
        displayName=p.display_name or "",
        gender=p.gender or "",
        avatarUrl=p.avatar_url or "",
        bio=p.bio or "",
        savedRaceIds=p.saved_race_ids or [],
        groupRunIds=p.group_run_ids or [],
        createdAt=p.created_at,
    )


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the current user's profile."""
    result = await db.execute(
        select(Profile).where(Profile.id == user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        logger.warning("Profile not found", extra={"user_id": user["user_id"]})
        raise HTTPException(status_code=404, detail="Profile not found")
    logger.debug("Profile fetched", extra={"user_id": user["user_id"]})
    return _map_profile(profile)


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    updates: ProfileUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile."""
    result = await db.execute(
        select(Profile).where(Profile.id == user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        logger.warning("Profile not found on update", extra={"user_id": user["user_id"]})
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    logger.info("Profile updated", extra={"user_id": user["user_id"], "fields": list(update_data.keys())})
    return _map_profile(profile)


@router.post("/me/saved-races/{race_id}")
async def add_saved_race(
    race_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a race to the user's saved list."""
    result = await db.execute(
        select(Profile).where(Profile.id == user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    current = profile.saved_race_ids or []
    if race_id not in current:
        profile.saved_race_ids = [*current, race_id]
        await db.commit()
        await db.refresh(profile)
        logger.info("Race saved", extra={"user_id": user["user_id"], "race_id": race_id})

    return {"savedRaceIds": profile.saved_race_ids or []}


@router.delete("/me/saved-races/{race_id}")
async def remove_saved_race(
    race_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a race from the user's saved list."""
    result = await db.execute(
        select(Profile).where(Profile.id == user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    current = profile.saved_race_ids or []
    profile.saved_race_ids = [r for r in current if r != race_id]
    await db.commit()
    await db.refresh(profile)
    logger.info("Race removed", extra={"user_id": user["user_id"], "race_id": race_id})

    return {"savedRaceIds": profile.saved_race_ids or []}
