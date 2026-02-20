from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import trails, group_runs, hazards, auth, profiles, upload
from app.services.realtime import manager

app = FastAPI(title="TrailPulse API", version="1.0.0")

# ─── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────
app.include_router(trails.router)
app.include_router(group_runs.router)
app.include_router(hazards.router)
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(upload.router)


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
