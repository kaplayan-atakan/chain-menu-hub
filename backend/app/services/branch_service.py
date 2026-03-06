import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase_client
from app.models.branch import BranchCreate, BranchResponse, BranchUpdate

logger = logging.getLogger(__name__)


async def list_branches(brand_id: UUID | None = None) -> list[BranchResponse]:
    """
    Soft-delete edilmemiş şubeleri döndürür.
    brand_id verilirse sadece o markaya ait şubeler filtrelenir.
    """
    client = get_supabase_client()

    query = (
        client.table("branches")
        .select("id, brand_id, name, location_info, is_active, created_at, updated_at")
        .is_("deleted_at", "null")
    )
    if brand_id is not None:
        query = query.eq("brand_id", str(brand_id))

    resp = await asyncio.to_thread(lambda: query.order("created_at").execute())
    return [BranchResponse(**row) for row in resp.data]


async def get_branch(branch_id: UUID) -> BranchResponse:
    """Tek bir şubeyi ID'ye göre getirir. Bulunamazsa 404."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("branches")
        .select("id, brand_id, name, location_info, is_active, created_at, updated_at")
        .eq("id", str(branch_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {branch_id} not found.",
        )
    return BranchResponse(**resp.data)


async def create_branch(payload: BranchCreate) -> BranchResponse:
    """
    Yeni şube oluşturur.
    Bağlı marka mevcut ve aktif olmalı — yoksa 404.
    """
    client = get_supabase_client()

    # FK bütünlüğü: marka var mı kontrol et
    brand_check = await asyncio.to_thread(
        lambda: client.table("brands")
        .select("id")
        .eq("id", str(payload.brand_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not brand_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand {payload.brand_id} not found. Cannot create branch.",
        )

    insert_data = payload.model_dump()
    insert_data["brand_id"] = str(payload.brand_id)

    resp = await asyncio.to_thread(
        lambda: client.table("branches").insert(insert_data).execute()
    )
    return BranchResponse(**resp.data[0])


async def update_branch(branch_id: UUID, payload: BranchUpdate) -> BranchResponse:
    """Mevcut şubeyi günceller. Bulunamazsa 404."""
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("branches")
        .update(update_data)
        .eq("id", str(branch_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {branch_id} not found.",
        )
    return BranchResponse(**resp.data[0])


async def delete_branch(branch_id: UUID) -> None:
    """
    Soft delete: deleted_at alanını doldurur.
    Kırmızı Çizgi — fiziksel silme yasaktır.
    """
    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    resp = await asyncio.to_thread(
        lambda: client.table("branches")
        .update({"deleted_at": now})
        .eq("id", str(branch_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {branch_id} not found.",
        )
