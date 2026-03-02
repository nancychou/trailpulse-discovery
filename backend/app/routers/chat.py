"""Chat router — exposes the trail planning AI agent as an API."""

import asyncio
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user_optional
from app.logging import get_logger
from app.agent.agent import run_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = get_logger(__name__)

# ── In-memory session store ─────────────────────────────────────
# Key: session_id (str), Value: {"history": list, "updated_at": float}
_sessions: dict[str, dict] = {}
SESSION_TTL_SECONDS = 1800  # 30 minutes


def _cleanup_sessions() -> None:
    """Remove sessions older than TTL."""
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s["updated_at"] > SESSION_TTL_SECONDS]
    for sid in expired:
        del _sessions[sid]


# ── Request / Response schemas ──────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


# ── Endpoint ────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    user: dict | None = Depends(get_current_user_optional),
):
    """Send a message to the trail planning AI and get a response."""
    _cleanup_sessions()

    user_id = user["user_id"] if user else "anonymous"

    # Resolve or create session
    session_id = body.session_id
    if session_id and session_id in _sessions:
        session = _sessions[session_id]
        conversation_history = session["history"]
    else:
        session_id = str(uuid.uuid4())
        conversation_history = []
        _sessions[session_id] = {"history": conversation_history, "updated_at": time.time()}

    logger.info(
        "Chat message received",
        extra={"user_id": user_id, "session_id": session_id, "message_length": len(body.message)},
    )

    try:
        # Offload synchronous agent call to thread pool
        response_text = await asyncio.to_thread(
            run_agent,
            body.message,
            conversation_history,
            user_id,
        )
    except Exception as e:
        logger.exception("Agent error", extra={"user_id": user_id, "session_id": session_id})
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    # Update session timestamp
    _sessions[session_id]["updated_at"] = time.time()

    logger.info(
        "Chat response generated",
        extra={"user_id": user_id, "session_id": session_id, "response_length": len(response_text)},
    )

    return ChatResponse(response=response_text, session_id=session_id)
