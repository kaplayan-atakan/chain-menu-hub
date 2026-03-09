from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_admin, get_current_user
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
from app.models.user import UserContext, UserRole
from app.services import menu_service

router = APIRouter(prefix="/menus", tags=["menus"])


# ──────────────────────────────────────────────
# RBAC helpers
# ──────────────────────────────────────────────


def _assert_admin(user: UserContext) -> None:
    """Master menü (kategori/ürün) CRUD yalnızca Admin'e açıktır."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for master menu operations.",
        )


def _assert_branch_access(user: UserContext, branch_id: UUID) -> None:
    """
    Admin → her şubeye erişebilir.
    Branch official → yalnızca atandığı şubelere erişebilir.
    """
    if user.role == UserRole.admin:
        return
    if branch_id not in user.branch_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have access to branch {branch_id}.",
        )


# ──────────────────────────────────────────────
# Public endpoint — auth gerektirmez
# ──────────────────────────────────────────────


@router.get("/public/{branch_id}", tags=["public-menu"])
async def get_public_menu(branch_id: UUID) -> dict:
    """
    QR menü: Müşteriye sunulan salt okunur menü.
    Master menü + şube override birleşimi.
    Cache-first: önce Redis, yoksa DB → Redis (TTL 24h).
    Auth gerektirmez.
    """
    return await menu_service.get_public_menu(branch_id)


# ──────────────────────────────────────────────
# Categories — Admin-only master menü CRUD
# ──────────────────────────────────────────────


@router.get(
    "/categories/{brand_id}",
    response_model=list[MenuCategoryResponse],
)
async def list_categories(
    brand_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> list[MenuCategoryResponse]:
    """Bir markanın master menü kategorilerini listeler."""
    return await menu_service.list_categories(brand_id)


@router.post(
    "/categories",
    response_model=MenuCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: MenuCategoryCreate,
    user: UserContext = Depends(get_current_user),
) -> MenuCategoryResponse:
    """Yeni kategori oluşturur (Admin only). Tüm şubelerin cache'ini invalidate eder."""
    _assert_admin(user)
    return await menu_service.create_category(payload)


@router.patch(
    "/categories/{category_id}",
    response_model=MenuCategoryResponse,
)
async def update_category(
    category_id: UUID,
    payload: MenuCategoryUpdate,
    user: UserContext = Depends(get_current_user),
) -> MenuCategoryResponse:
    """Kategoriyi günceller (Admin only). Cache invalidation tetiklenir."""
    _assert_admin(user)
    return await menu_service.update_category(category_id, payload)


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(
    category_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> None:
    """Kategoriyi soft-delete yapar (Admin only). Cache invalidation tetiklenir."""
    _assert_admin(user)
    await menu_service.delete_category(category_id)


# ──────────────────────────────────────────────
# Items — Admin-only master menü CRUD
# ──────────────────────────────────────────────


@router.get(
    "/items/{category_id}",
    response_model=list[MenuItemResponse],
)
async def list_items(
    category_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> list[MenuItemResponse]:
    """Bir kategorinin ürünlerini listeler."""
    return await menu_service.list_items(category_id)


@router.post(
    "/items",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    payload: MenuItemCreate,
    user: UserContext = Depends(get_current_user),
) -> MenuItemResponse:
    """Yeni ürün oluşturur (Admin only). Cache invalidation tetiklenir."""
    _assert_admin(user)
    return await menu_service.create_item(payload)


@router.patch(
    "/items/{item_id}",
    response_model=MenuItemResponse,
)
async def update_item(
    item_id: UUID,
    payload: MenuItemUpdate,
    user: UserContext = Depends(get_current_user),
) -> MenuItemResponse:
    """Ürünü günceller (Admin only). Cache invalidation tetiklenir."""
    _assert_admin(user)
    return await menu_service.update_item(item_id, payload)


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    item_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> None:
    """Ürünü soft-delete yapar (Admin only). Cache invalidation tetiklenir."""
    _assert_admin(user)
    await menu_service.delete_item(item_id)


# ──────────────────────────────────────────────
# Branch Item Overrides — şube bazlı fiyat/gizleme
# ──────────────────────────────────────────────


@router.get(
    "/overrides/{branch_id}",
    response_model=list[BranchItemOverrideResponse],
)
async def list_overrides(
    branch_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> list[BranchItemOverrideResponse]:
    """Bir şubenin tüm override'larını listeler."""
    _assert_branch_access(user, branch_id)
    return await menu_service.list_overrides(branch_id)


@router.post(
    "/overrides",
    response_model=BranchItemOverrideResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_override(
    payload: BranchItemOverrideCreate,
    user: UserContext = Depends(get_current_user),
) -> BranchItemOverrideResponse:
    """
    Override oluşturur veya günceller (UPSERT).
    Aynı (branch_id, menu_item_id) çifti varsa günceller.
    """
    _assert_branch_access(user, payload.branch_id)
    return await menu_service.upsert_override(payload)


@router.delete(
    "/overrides/{override_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_override(
    override_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> None:
    """Override'ı siler (hard delete — varsayılan davranışa geri döner)."""
    await menu_service.delete_override(override_id)
