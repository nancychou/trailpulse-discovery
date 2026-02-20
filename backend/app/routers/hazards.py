import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trail import Hazard
from app.schemas.trail import HazardCreate
from app.services.realtime import manager

router = APIRouter(prefix="/api/hazards", tags=["hazards"])


@router.post("")
async def create_hazard(
    payload: HazardCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a hazard report and broadcast via WebSocket."""
    now = datetime.now(timezone.utc).isoformat()
    hazard = Hazard(
        id=str(uuid.uuid4()),
        trail_id=payload.trail_id,
        type=payload.type,
        message=payload.message,
        date="Just Now",
        created_at=now,
    )
    db.add(hazard)
    await db.commit()

    # Broadcast to WebSocket clients
    await manager.broadcast(
        "hazard_created",
        {"type": hazard.type, "message": hazard.message, "date": "Just Now"},
    )

    return {"ok": True}
