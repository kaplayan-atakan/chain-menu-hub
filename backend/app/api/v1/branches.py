from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_admin
from app.models.branch import BranchCreate, BranchResponse, BranchUpdate
from app.models.user import UserContext
from app.services import branch_service

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=list[BranchResponse])
async def list_branches(
    brand_id: UUID | None = Query(default=None, description="Markaya göre filtrele"),
    _user: UserContext = Depends(get_current_admin),
) -> list[BranchResponse]:
    """Tüm aktif şubeleri listeler. brand_id ile filtrelenebilir. (Admin only)"""
    return await branch_service.list_branches(brand_id=brand_id)


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: UUID,
    _user: UserContext = Depends(get_current_admin),
) -> BranchResponse:
    """Tek bir şubeyi getirir. (Admin only)"""
    return await branch_service.get_branch(branch_id)


@router.post(
    "",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_branch(
    payload: BranchCreate,
    _user: UserContext = Depends(get_current_admin),
) -> BranchResponse:
    """Yeni şube oluşturur. (Admin only)"""
    return await branch_service.create_branch(payload)


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    payload: BranchUpdate,
    _user: UserContext = Depends(get_current_admin),
) -> BranchResponse:
    """Mevcut şubeyi günceller. (Admin only)"""
    return await branch_service.update_branch(branch_id, payload)


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: UUID,
    _user: UserContext = Depends(get_current_admin),
) -> None:
    """Şubeyi soft-delete yapar. (Admin only)"""
    await branch_service.delete_branch(branch_id)
