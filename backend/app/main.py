import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.middleware.cors import setup_cors
from app.api.v1.api import api_router
from app.services.telemetry_manager import telemetry_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    broadcast_task = None
    if os.getenv("TESTING") != "1":
        broadcast_task = asyncio.create_task(telemetry_manager.broadcast_loop())
    try:
        yield
    finally:
        telemetry_manager.is_broadcasting = False
        if broadcast_task:
            broadcast_task.cancel()
            try:
                await broadcast_task
            except (asyncio.CancelledError, Exception):
                pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production REST & WebSocket API for VYOM — MALE UAV Aero Piston Engine Digital Twin",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
setup_cors(app)

# Include v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
