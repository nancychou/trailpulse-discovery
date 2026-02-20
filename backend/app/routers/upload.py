from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.profile import Profile
from app.services.storage_service import upload_avatar

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/avatar")
async def upload_avatar_endpoint(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an avatar image to Supabase Storage and update the user's profile."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()
    public_url = await upload_avatar(user["user_id"], file_bytes, file.filename)

    # Update profile with new avatar URL
    result = await db.execute(
        select(Profile).where(Profile.id == user["user_id"])
    )
    profile = result.scalar_one_or_none()
    if profile:
        profile.avatar_url = public_url
        await db.commit()

    return {"avatarUrl": public_url}
