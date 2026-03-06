from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
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


async def _assert_category_branch_access(
    user: UserContext, category_id: UUID
) -> UUID:
    """Kategori'nin bağlı olduğu branch_id'yi çözer ve erişim kontrolü yapar."""
    category = await menu_service.get_category(category_id)
    _assert_branch_access(user, category.branch_id)
    return category.branch_id


async def _assert_item_branch_access(user: UserContext, item_id: UUID) -> None:
    """Ürünün bağlı olduğu branch'e erişim kontrolü yapar."""
    branch_id = await menu_service._resolve_branch_id_from_category(
        (await menu_service.get_item(item_id)).category_id
    )
    _assert_branch_access(user, branch_id)


# ──────────────────────────────────────────────
# Public endpoint — auth gerektirmez
# ──────────────────────────────────────────────


@router.get("/public/{branch_id}", tags=["public-menu"])
async def get_public_menu(branch_id: UUID) -> dict:
    """
    QR menü: Müşteriye sunulan salt okunur menü.
    Cache-first: önce Redis, yoksa DB → Redis (TTL 24h).
    Auth gerektirmez.
    """
    return await menu_service.get_public_menu(branch_id)


# ──────────────────────────────────────────────
# Categories — authenticated CRUD
# ──────────────────────────────────────────────


@router.get(
    "/categories/{branch_id}",
    response_model=list[MenuCategoryResponse],
)
async def list_categories(
    branch_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> list[MenuCategoryResponse]:
    """Bir şubenin kategorilerini listeler."""
    _assert_branch_access(user, branch_id)
    return await menu_service.list_categories(branch_id)


@router.post(
    "/categories",
    response_model=MenuCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: MenuCategoryCreate,
    user: UserContext = Depends(get_current_user),
) -> MenuCategoryResponse:
    """Yeni kategori oluşturur. Yazma işlemi → cache invalidation tetiklenir."""
    _assert_branch_access(user, payload.branch_id)
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
    """Kategoriyi günceller. Yazma işlemi → cache invalidation tetiklenir."""
    await _assert_category_branch_access(user, category_id)
    return await menu_service.update_category(category_id, payload)


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(
    category_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> None:
    """Kategoriyi soft-delete yapar. Cache invalidation tetiklenir."""
    await _assert_category_branch_access(user, category_id)
    await menu_service.delete_category(category_id)


# ──────────────────────────────────────────────
# Items — authenticated CRUD
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
    await _assert_category_branch_access(user, category_id)
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
    """Yeni ürün oluşturur. Yazma işlemi → cache invalidation tetiklenir."""
    branch_id = await menu_service._resolve_branch_id_from_category(payload.category_id)
    _assert_branch_access(user, branch_id)
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
    """Ürünü günceller. Yazma işlemi → cache invalidation tetiklenir."""
    await _assert_item_branch_access(user, item_id)
    return await menu_service.update_item(item_id, payload)


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    item_id: UUID,
    user: UserContext = Depends(get_current_user),
) -> None:
    """Ürünü soft-delete yapar. Cache invalidation tetiklenir."""
    await _assert_item_branch_access(user, item_id)
    await menu_service.delete_item(item_id)
