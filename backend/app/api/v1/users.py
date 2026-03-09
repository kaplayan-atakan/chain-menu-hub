from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_admin, get_current_user
from app.models.user import UserContext, UserCreate, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: UserContext = Depends(get_current_user),
) -> UserResponse:
    """Giriş yapan kullanıcının profil ve şube bilgilerini döner."""
    return await user_service.get_user(user.id)


@router.get("", response_model=list[UserResponse])
async def list_users(
    _user: UserContext = Depends(get_current_admin),
) -> list[UserResponse]:
    """Tüm kullanıcıları atanmış şubeleriyle birlikte listeler. (Admin only)"""
    return await user_service.list_users()


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: UserCreate,
    _user: UserContext = Depends(get_current_admin),
) -> UserResponse:
    """
    Yeni kullanıcı oluşturur. (Admin only)
    - Supabase Auth'ta hesap açar
    - profiles tablosuna kaydeder
    - branch_ids verilmişse branch_users tablosuna atar
    """
    return await user_service.create_user(payload)
