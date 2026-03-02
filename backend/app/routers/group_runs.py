import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.logging import get_logger
from app.models.group_run import GroupRun
from app.schemas.group_run import GroupRunOut, GroupRunCreate
from app.services.realtime import manager

router = APIRouter(prefix="/api/group-runs", tags=["group_runs"])
logger = get_logger(__name__)


def _map_group_run(row: GroupRun) -> GroupRunOut:
    return GroupRunOut(
        id=row.id,
        trailId=row.trail_id,
        name=row.name,
        time=row.time or "",
        type=row.type or "",
        color=row.color or "text-primary",
        avatarUrl=row.avatar_url or "",
        createdAt=row.created_at,
    )


@router.get("", response_model=list[GroupRunOut])
async def get_group_runs(db: AsyncSession = Depends(get_db)):
    """Fetch all group runs ordered by creation date descending."""
    result = await db.execute(
        select(GroupRun).order_by(GroupRun.created_at.desc())
    )
    runs = result.scalars().all()
    logger.debug("Fetched group runs", extra={"count": len(runs)})
    return [_map_group_run(r) for r in runs]


@router.post("", response_model=GroupRunOut)
async def create_group_run(
    payload: GroupRunCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new group run and broadcast via WebSocket."""
    now = datetime.now(timezone.utc)
    run = GroupRun(
        id=uuid.uuid4(),
        trail_id=payload.trail_id,
        name=payload.name,
        time=payload.time,
        type=payload.type,
        color=payload.color,
        avatar_url=f"https://picsum.photos/seed/{int(datetime.now().timestamp())}/100/100",
        created_at=now,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    out = _map_group_run(run)

    logger.info(
        "Group run created",
        extra={
            "run_id": run.id,
            "trail_id": payload.trail_id,
            "run_name": payload.name,
            "run_type": payload.type,
        },
    )

    # Broadcast to WebSocket clients
    await manager.broadcast("group_run_created", out.model_dump())

    return out
