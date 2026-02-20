from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import trails, group_runs, hazards, auth, profiles, upload, weather
from app.services.realtime import manager

# ─── Rate Limiter (shared across routers via app.state) ───────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="TrailPulse API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ─── Routers ───────────────────────────────────────────────────
app.include_router(trails.router)
app.include_router(group_runs.router)
app.include_router(hazards.router)
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(upload.router)
app.include_router(weather.router)


# ─── Health Check ──────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── WebSocket ─────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; handle pings from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
