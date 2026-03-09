"""
Menu Service — Brand-Based Master Menu + Branch Overrides
==========================================================

Mimari:
  • menu_categories → brand_id (marka bazlı master menü)
  • menu_items      → category_id (master ürünler)
  • branch_item_overrides → şube bazlı fiyat/gizlilik özelleştirmesi

Cache Stratejisi:
  • Key: menu:branch_{branch_id}
  • Master menü değiştiğinde o markaya bağlı TÜM şubelerin cache'i silinir.
  • Override değiştiğinde sadece ilgili şubenin cache'i silinir.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status

from app.core.cache import redis_cache
from app.core.database import get_supabase_client
from app.models.branch_item_override import (
    BranchItemOverrideCreate,
    BranchItemOverrideResponse,
    BranchItemOverrideUpdate,
)
from app.models.menu_category import (
    MenuCategoryCreate,
    MenuCategoryResponse,
    MenuCategoryUpdate,
)
from app.models.menu_item import MenuItemCreate, MenuItemResponse, MenuItemUpdate

logger = logging.getLogger(__name__)

_MENU_CACHE_TTL = 86400  # 24 saat

_CATEGORY_FIELDS = "id, brand_id, name, sort_order, is_active, created_at, updated_at"
_ITEM_FIELDS = (
    "id, category_id, name, description, price, is_active, created_at, updated_at"
)
_OVERRIDE_FIELDS = (
    "id, branch_id, menu_item_id, custom_price, is_hidden, created_at, updated_at"
)


# ──────────────────────────────────────────────
# Cache helpers
# ──────────────────────────────────────────────


def _menu_cache_key(branch_id: UUID) -> str:
    return f"menu:branch_{branch_id}"


async def _invalidate_branch_cache(branch_id: UUID) -> None:
    """Tek bir şubenin menü cache'ini siler."""
    key = _menu_cache_key(branch_id)
    try:
        await redis_cache.delete(key)
        logger.info("Cache invalidated for %s", key)
    except Exception as exc:
        logger.warning(
            "Cache invalidation failed for %s (graceful degradation): %s", key, exc
        )


async def _invalidate_brand_caches(brand_id: UUID) -> None:
    """
    Markaya bağlı TÜM şubelerin cache'ini siler.
    Master menü değişikliklerinde çağrılır.
    """
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("branches")
        .select("id")
        .eq("brand_id", str(brand_id))
        .is_("deleted_at", "null")
        .execute()
    )
    for branch in resp.data:
        await _invalidate_branch_cache(UUID(branch["id"]))


async def _resolve_brand_id_from_category(category_id: UUID) -> UUID:
    """Kategori ID'sinden brand_id'yi çözer."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .select("brand_id")
        .eq("id", str(category_id))
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category {category_id} not found.",
        )
    return UUID(resp.data["brand_id"])


async def _resolve_brand_id_from_item(item_id: UUID) -> UUID:
    """Ürün ID → kategori → brand_id zincirini çözer."""
    client = get_supabase_client()
    item_resp = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .select("category_id")
        .eq("id", str(item_id))
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not item_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item {item_id} not found.",
        )
    return await _resolve_brand_id_from_category(UUID(item_resp.data["category_id"]))


# ──────────────────────────────────────────────
# Menu Categories — CRUD
# ──────────────────────────────────────────────


async def list_categories(brand_id: UUID) -> list[MenuCategoryResponse]:
    """Markanın master kategorilerini sort_order'a göre döndürür."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .select(_CATEGORY_FIELDS)
        .eq("brand_id", str(brand_id))
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )
    return [MenuCategoryResponse(**row) for row in resp.data]


async def get_category(category_id: UUID) -> MenuCategoryResponse:
    """Tek bir kategoriyi getirir. Bulunamazsa 404."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .select(_CATEGORY_FIELDS)
        .eq("id", str(category_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category {category_id} not found.",
        )
    return MenuCategoryResponse(**resp.data)


async def create_category(payload: MenuCategoryCreate) -> MenuCategoryResponse:
    client = get_supabase_client()

    # FK: marka var mı?
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
            detail=f"Brand {payload.brand_id} not found.",
        )

    insert_data = payload.model_dump()
    insert_data["brand_id"] = str(payload.brand_id)

    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories").insert(insert_data).execute()
    )
    result = MenuCategoryResponse(**resp.data[0])

    await _invalidate_brand_caches(payload.brand_id)
    return result


async def update_category(
    category_id: UUID, payload: MenuCategoryUpdate
) -> MenuCategoryResponse:
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    brand_id = await _resolve_brand_id_from_category(category_id)

    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .update(update_data)
        .eq("id", str(category_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category {category_id} not found.",
        )
    result = MenuCategoryResponse(**resp.data[0])

    await _invalidate_brand_caches(brand_id)
    return result


async def delete_category(category_id: UUID) -> None:
    brand_id = await _resolve_brand_id_from_category(category_id)

    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .update({"deleted_at": now})
        .eq("id", str(category_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category {category_id} not found.",
        )

    await _invalidate_brand_caches(brand_id)


# ──────────────────────────────────────────────
# Menu Items — CRUD
# ──────────────────────────────────────────────


async def list_items(category_id: UUID) -> list[MenuItemResponse]:
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .select(_ITEM_FIELDS)
        .eq("category_id", str(category_id))
        .is_("deleted_at", "null")
        .order("created_at")
        .execute()
    )
    return [MenuItemResponse(**row) for row in resp.data]


async def get_item(item_id: UUID) -> MenuItemResponse:
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .select(_ITEM_FIELDS)
        .eq("id", str(item_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item {item_id} not found.",
        )
    return MenuItemResponse(**resp.data)


async def create_item(payload: MenuItemCreate) -> MenuItemResponse:
    brand_id = await _resolve_brand_id_from_category(payload.category_id)

    client = get_supabase_client()
    insert_data = payload.model_dump()
    insert_data["category_id"] = str(payload.category_id)
    insert_data["price"] = str(payload.price)

    resp = await asyncio.to_thread(
        lambda: client.table("menu_items").insert(insert_data).execute()
    )
    result = MenuItemResponse(**resp.data[0])

    await _invalidate_brand_caches(brand_id)
    return result


async def update_item(item_id: UUID, payload: MenuItemUpdate) -> MenuItemResponse:
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    if "price" in update_data:
        update_data["price"] = str(update_data["price"])

    brand_id = await _resolve_brand_id_from_item(item_id)

    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .update(update_data)
        .eq("id", str(item_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item {item_id} not found.",
        )
    result = MenuItemResponse(**resp.data[0])

    await _invalidate_brand_caches(brand_id)
    return result


async def delete_item(item_id: UUID) -> None:
    brand_id = await _resolve_brand_id_from_item(item_id)

    client = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    resp = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .update({"deleted_at": now})
        .eq("id", str(item_id))
        .is_("deleted_at", "null")
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item {item_id} not found.",
        )

    await _invalidate_brand_caches(brand_id)


# ──────────────────────────────────────────────
# Branch Item Overrides — CRUD
# ──────────────────────────────────────────────


async def list_overrides(branch_id: UUID) -> list[BranchItemOverrideResponse]:
    """Bir şubenin tüm override kayıtlarını döndürür."""
    client = get_supabase_client()
    resp = await asyncio.to_thread(
        lambda: client.table("branch_item_overrides")
        .select(_OVERRIDE_FIELDS)
        .eq("branch_id", str(branch_id))
        .execute()
    )
    return [BranchItemOverrideResponse(**row) for row in resp.data]


async def upsert_override(
    payload: BranchItemOverrideCreate,
) -> BranchItemOverrideResponse:
    """Override yoksa oluşturur, varsa günceller (UPSERT)."""
    client = get_supabase_client()

    branch_check = await asyncio.to_thread(
        lambda: client.table("branches")
        .select("id")
        .eq("id", str(payload.branch_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not branch_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {payload.branch_id} not found.",
        )

    item_check = await asyncio.to_thread(
        lambda: client.table("menu_items")
        .select("id")
        .eq("id", str(payload.menu_item_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not item_check.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item {payload.menu_item_id} not found.",
        )

    insert_data = {
        "branch_id": str(payload.branch_id),
        "menu_item_id": str(payload.menu_item_id),
        "custom_price": str(payload.custom_price) if payload.custom_price is not None else None,
        "is_hidden": payload.is_hidden,
    }

    resp = await asyncio.to_thread(
        lambda: client.table("branch_item_overrides")
        .upsert(insert_data, on_conflict="branch_id,menu_item_id")
        .execute()
    )
    result = BranchItemOverrideResponse(**resp.data[0])

    await _invalidate_branch_cache(payload.branch_id)
    return result


async def delete_override(override_id: UUID) -> None:
    """Override kaydını siler (hard delete — override tablosunda soft delete gereksiz)."""
    client = get_supabase_client()

    existing = await asyncio.to_thread(
        lambda: client.table("branch_item_overrides")
        .select("branch_id")
        .eq("id", str(override_id))
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Override {override_id} not found.",
        )
    branch_id = UUID(existing.data["branch_id"])

    await asyncio.to_thread(
        lambda: client.table("branch_item_overrides")
        .delete()
        .eq("id", str(override_id))
        .execute()
    )

    await _invalidate_branch_cache(branch_id)


# ──────────────────────────────────────────────
# Public Menu — Cache-first read
# ──────────────────────────────────────────────


class _DecimalEncoder(json.JSONEncoder):
    def default(self, o: object) -> object:
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)


async def get_public_menu(branch_id: UUID) -> dict:
    """
    QR menü: Markanın master menüsünü çeker, şube override'larıyla birleştirir.
    • is_hidden=true ürünler filtrelenir (dönmez).
    • custom_price varsa orijinal fiyat yerine o döner.
    Cache-first: Redis (TTL 24h) → DB fallback.
    """
    cache_key = _menu_cache_key(branch_id)

    # ── 1. Redis'ten oku ──
    try:
        cached = await redis_cache.get(cache_key)
        if cached is not None:
            logger.debug("Cache HIT for %s", cache_key)
            return json.loads(cached)
    except Exception as exc:
        logger.warning(
            "Redis read failed for %s (fallback to DB): %s", cache_key, exc
        )

    # ── 2. Cache miss → DB'den çek ──
    logger.debug("Cache MISS for %s, fetching from DB", cache_key)
    client = get_supabase_client()

    # Şubeyi kontrol et
    branch_resp = await asyncio.to_thread(
        lambda: client.table("branches")
        .select("id, brand_id, name")
        .eq("id", str(branch_id))
        .eq("is_active", True)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not branch_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {branch_id} not found or inactive.",
        )

    brand_id_str = branch_resp.data["brand_id"]

    # Marka adını çek
    brand_resp = await asyncio.to_thread(
        lambda: client.table("brands")
        .select("name")
        .eq("id", brand_id_str)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    brand_name = brand_resp.data["name"] if brand_resp.data else ""

    # Master kategoriler (brand_id bazlı)
    cat_resp = await asyncio.to_thread(
        lambda: client.table("menu_categories")
        .select(_CATEGORY_FIELDS)
        .eq("brand_id", brand_id_str)
        .eq("is_active", True)
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )

    # Bu şubeye ait tüm override'ları tek sorguda çek
    override_resp = await asyncio.to_thread(
        lambda: client.table("branch_item_overrides")
        .select("menu_item_id, custom_price, is_hidden")
        .eq("branch_id", str(branch_id))
        .execute()
    )
    overrides_map: dict[str, dict] = {
        row["menu_item_id"]: row for row in override_resp.data
    }

    # Kategoriler + ürünler + override merge
    categories = []
    for cat in cat_resp.data:
        cat_id = cat["id"]
        items_resp = await asyncio.to_thread(
            lambda cid=cat_id: client.table("menu_items")
            .select(_ITEM_FIELDS)
            .eq("category_id", cid)
            .eq("is_active", True)
            .is_("deleted_at", "null")
            .order("created_at")
            .execute()
        )

        merged_items = []
        for item in items_resp.data:
            override = overrides_map.get(item["id"])
            if override and override.get("is_hidden"):
                continue
            final_item = {**item}
            if override and override.get("custom_price") is not None:
                final_item["price"] = override["custom_price"]
            merged_items.append(final_item)

        categories.append({
            "id": cat["id"],
            "name": cat["name"],
            "sort_order": cat["sort_order"],
            "items": merged_items,
        })

    menu_data = {
        "branch_id": branch_resp.data["id"],
        "branch_name": branch_resp.data["name"],
        "brand_name": brand_name,
        "categories": categories,
    }

    # ── 3. Redis'e yaz (TTL 24h) ──
    try:
        await redis_cache.set(
            cache_key,
            json.dumps(menu_data, cls=_DecimalEncoder),
            ex=_MENU_CACHE_TTL,
        )
        logger.info("Cache SET for %s (TTL %ds)", cache_key, _MENU_CACHE_TTL)
    except Exception as exc:
        logger.warning(
            "Redis write failed for %s (graceful degradation): %s", cache_key, exc
        )

    return menu_data
