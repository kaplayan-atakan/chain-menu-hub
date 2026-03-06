import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase_client
from app.models.brand import BrandCreate, BrandResponse, BrandUpdate

logger = logging.getLogger(__name__)


async def list_brands() -> list[BrandResponse]:
    """Soft-delete edilmemiş tüm markaları döndürür."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .select("id, name, created_at, updated_at")
        .is_("deleted_at", "null")
        .order("created_at")
        .execute()
    )
    return [BrandResponse(**row) for row in resp.data]


async def get_brand(brand_id: UUID) -> BrandResponse:
    """Tek bir markayı ID'ye göre getirir. Bulunamazsa 404."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .select("id, name, created_at, updated_at")
        .eq("id", str(brand_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand {brand_id} not found.",
        )
    return BrandResponse(**resp.data)


async def create_brand(payload: BrandCreate) -> BrandResponse:
    """Yeni marka oluşturur."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .insert(payload.model_dump())
        .execute()
    )
    return BrandResponse(**resp.data[0])


async def update_brand(brand_id: UUID, payload: BrandUpdate) -> BrandResponse:
    """Mevcut markayı günceller. Bulunamazsa 404."""
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .update(update_data)
        .eq("id", str(brand_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand {brand_id} not found.",
        )
    return BrandResponse(**resp.data[0])


async def delete_brand(brand_id: UUID) -> None:
    """
    Soft delete: deleted_at alanını doldurur.
    Kırmızı Çizgi — fiziksel silme yasaktır.
    """
    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .update({"deleted_at": now})
        .eq("id", str(brand_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand {brand_id} not found.",
        )
