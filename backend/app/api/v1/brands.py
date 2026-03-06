from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_admin
from app.models.brand import BrandCreate, BrandResponse, BrandUpdate
from app.models.user import UserContext
from app.services import brand_service

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=list[BrandResponse])
async def list_brands(
    _user: UserContext = Depends(get_current_admin),
) -> list[BrandResponse]:
    """Tüm aktif markaları listeler. (Admin only)"""
    return await brand_service.list_brands()


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(
    brand_id: UUID,
    _user: UserContext = Depends(get_current_admin),
) -> BrandResponse:
    """Tek bir markayı getirir. (Admin only)"""
    return await brand_service.get_brand(brand_id)


@router.post(
    "",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_brand(
    payload: BrandCreate,
    _user: UserContext = Depends(get_current_admin),
) -> BrandResponse:
    """Yeni marka oluşturur. (Admin only)"""
    return await brand_service.create_brand(payload)


@router.patch("/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: UUID,
    payload: BrandUpdate,
    _user: UserContext = Depends(get_current_admin),
) -> BrandResponse:
    """Mevcut markayı günceller. (Admin only)"""
    return await brand_service.update_brand(brand_id, payload)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: UUID,
    _user: UserContext = Depends(get_current_admin),
) -> None:
    """Markayı soft-delete yapar. (Admin only)"""
    await brand_service.delete_brand(brand_id)
