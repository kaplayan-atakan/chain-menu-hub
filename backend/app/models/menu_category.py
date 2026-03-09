from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MenuCategoryBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True


class MenuCategoryCreate(MenuCategoryBase):
    brand_id: UUID


class MenuCategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class MenuCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand_id: UUID
    name: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
