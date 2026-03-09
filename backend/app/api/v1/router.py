from fastapi import APIRouter

from app.api.v1.brands import router as brands_router
from app.api.v1.branches import router as branches_router
from app.api.v1.menus import router as menus_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(brands_router)
api_v1_router.include_router(branches_router)
api_v1_router.include_router(menus_router)
api_v1_router.include_router(users_router)
