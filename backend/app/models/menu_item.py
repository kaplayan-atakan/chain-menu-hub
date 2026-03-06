from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MenuItemBase(BaseModel):
    name: str
    description: str | None = None
    price: Decimal = Field(ge=0, decimal_places=2)
    is_active: bool = True


class MenuItemCreate(MenuItemBase):
    category_id: UUID


class MenuItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_active: bool | None = None


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    name: str
    description: str | None = None
    price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
