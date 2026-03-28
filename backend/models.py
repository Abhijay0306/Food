from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class RegisterReq(BaseModel):
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    role: str = "customer"
    phone: str = Field(default="", max_length=20)


class LoginReq(BaseModel):
    email: str
    password: str


class KitchenCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    address: str = Field(default="", max_length=300)
    lat: float = Field(default=0.0, ge=-90, le=90)
    lng: float = Field(default=0.0, ge=-180, le=180)
    cuisine_types: List[str] = []
    image_url: str = Field(default="", max_length=2048)


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    price: float = Field(..., gt=0, le=10_000)
    category: str = Field(default="", max_length=60)
    image_url: str = Field(default="", max_length=2048)
    is_available: bool = True


class OrderItemIn(BaseModel):
    menu_item_id: str
    quantity: int = Field(default=1, ge=1, le=50)


class OrderCreate(BaseModel):
    kitchen_id: str
    items: List[OrderItemIn] = Field(..., min_length=1)
    delivery_address: str = Field(..., min_length=5, max_length=300)
    origin_url: str


class StatusUpdate(BaseModel):
    status: str


class ReviewCreate(BaseModel):
    order_id: str
    kitchen_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(default="", max_length=500)
