from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BranchItemOverrideCreate(BaseModel):
    branch_id: UUID
    menu_item_id: UUID
    custom_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_hidden: bool = False


class BranchItemOverrideUpdate(BaseModel):
    custom_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_hidden: bool | None = None


class BranchItemOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    branch_id: UUID
    menu_item_id: UUID
    custom_price: Decimal | None = None
    is_hidden: bool
    created_at: datetime
    updated_at: datetime
