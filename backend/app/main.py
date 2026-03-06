import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.cache import redis_cache
from app.core.config import settings
from app.core.database import get_supabase_client
from app.api.v1.router import api_v1_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Chain Menu Hub API",
    description="Merkezi yönetim paneli ve QR menü platformu backend servisi.",
    version="0.1.0",
)

# ---- CORS Middleware ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- API v1 Router ----
app.include_router(api_v1_router)


# ---- Health Check ----
@app.get("/health", tags=["infra"])
async def health_check() -> dict:
    """
    Servis sağlık kontrolü.
    Supabase (DB) ve Upstash Redis bağlantılarını gerçek zamanlı doğrular.
    Graceful Degradation: Herhangi bir servis erişilemezse API çökmez,
    durum raporunu döndürür.
    """
    db_status = "healthy"
    cache_status = "healthy"

    # ── Supabase kontrolü ──
    try:
        client = get_supabase_client()
        await asyncio.to_thread(
            lambda: client.table("brands").select("id").limit(1).execute()
        )
    except Exception as exc:
        logger.error("Supabase health check failed: %s", exc)
        db_status = "unhealthy"

    # ── Redis kontrolü ──
    try:
        pong = await redis_cache.ping()
        if not pong:
            cache_status = "unhealthy"
    except Exception as exc:
        logger.warning(
            "Redis health check failed (graceful degradation active): %s", exc
        )
        cache_status = "unhealthy"

    # ── Genel durum ──
    if db_status == "healthy" and cache_status == "healthy":
        overall = "ok"
    elif db_status == "unhealthy" and cache_status == "unhealthy":
        overall = "unhealthy"
    else:
        overall = "degraded"

    return {
        "status": overall,
        "service": "chain-menu-hub-api",
        "version": app.version,
        "checks": {
            "database": db_status,
            "cache": cache_status,
        },
    }
