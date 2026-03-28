from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
from db import get_db
from utils import haversine, doc_to_dict
from models import KitchenCreate, MenuItemCreate
from routes.auth import get_current_user, require_role

router = APIRouter()


# ── Kitchen routes ────────────────────────────────────────────────────────────

@router.get("/kitchens")
async def list_kitchens(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    search: Optional[str] = None,
    radius: float = 50,
):
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"cuisine_types": {"$regex": search, "$options": "i"}},
        ]
    kitchens = await db.kitchens.find(query, {
        "name": 1, "description": 1, "address": 1, "lat": 1, "lng": 1,
        "cuisine_types": 1, "image_url": 1, "is_open": 1, "rating": 1,
        "total_orders": 1, "owner_id": 1,
    }).to_list(100)

    results = []
    for k in kitchens:
        k = doc_to_dict(k)
        if lat is not None and lng is not None and k.get("lat") and k.get("lng"):
            k["distance"] = round(haversine(lat, lng, k["lat"], k["lng"]), 2)
        else:
            k["distance"] = None
        results.append(k)

    if lat is not None and lng is not None:
        results = [k for k in results if k["distance"] is None or k["distance"] <= radius]
        results.sort(key=lambda x: x["distance"] if x["distance"] is not None else 9999)
    return results


@router.get("/my/kitchen")
async def get_my_kitchen(request: Request):
    user = await require_role(request, ["kitchen_provider"])
    db = get_db()
    kitchen = await db.kitchens.find_one({"owner_id": user["id"]})
    if not kitchen:
        return None
    return doc_to_dict(kitchen)


@router.get("/kitchens/{kitchen_id}")
async def get_kitchen(kitchen_id: str):
    db = get_db()
    kitchen = await db.kitchens.find_one({"_id": ObjectId(kitchen_id)})
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    return doc_to_dict(kitchen)


@router.post("/kitchens")
async def create_kitchen(req: KitchenCreate, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    existing = await db.kitchens.find_one({"owner_id": user["id"]})
    if existing:
        raise HTTPException(400, "You already have a kitchen")
    kitchen_doc = {
        **req.model_dump(),
        "owner_id": user["id"],
        "is_open": True,
        "rating": 4.5,
        "total_orders": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.kitchens.insert_one(kitchen_doc)
    kitchen_doc["id"] = str(result.inserted_id)
    kitchen_doc.pop("_id", None)
    return kitchen_doc


@router.put("/kitchens/{kitchen_id}")
async def update_kitchen(kitchen_id: str, req: KitchenCreate, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    kitchen = await db.kitchens.find_one({"_id": ObjectId(kitchen_id)})
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    if str(kitchen.get("owner_id")) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    await db.kitchens.update_one({"_id": ObjectId(kitchen_id)}, {"$set": req.model_dump()})
    return {"message": "Kitchen updated"}


@router.put("/kitchens/{kitchen_id}/toggle")
async def toggle_kitchen(kitchen_id: str, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    kitchen = await db.kitchens.find_one({"_id": ObjectId(kitchen_id)})
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    if str(kitchen.get("owner_id")) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    new_open = not kitchen.get("is_open", True)
    await db.kitchens.update_one({"_id": ObjectId(kitchen_id)}, {"$set": {"is_open": new_open}})
    return {"is_open": new_open}


# ── Menu routes ───────────────────────────────────────────────────────────────

@router.get("/kitchens/{kitchen_id}/menu")
async def get_menu(kitchen_id: str):
    db = get_db()
    items = await db.menu_items.find({"kitchen_id": kitchen_id}).to_list(100)
    return [doc_to_dict(i) for i in items]


@router.post("/kitchens/{kitchen_id}/menu")
async def add_menu_item(kitchen_id: str, req: MenuItemCreate, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    kitchen = await db.kitchens.find_one({"_id": ObjectId(kitchen_id)})
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    if str(kitchen.get("owner_id")) != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")
    item_doc = {**req.model_dump(), "kitchen_id": kitchen_id, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.menu_items.insert_one(item_doc)
    item_doc["id"] = str(result.inserted_id)
    item_doc.pop("_id", None)
    return item_doc


@router.put("/menu-items/{item_id}")
async def update_menu_item(item_id: str, req: MenuItemCreate, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    item = await db.menu_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(404, "Item not found")
    kitchen = await db.kitchens.find_one({"_id": ObjectId(item["kitchen_id"])})
    if not kitchen or (str(kitchen.get("owner_id")) != user["id"] and user["role"] != "admin"):
        raise HTTPException(403, "Not authorized")
    await db.menu_items.update_one({"_id": ObjectId(item_id)}, {"$set": req.model_dump()})
    return {"message": "Item updated"}


@router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, request: Request):
    user = await require_role(request, ["kitchen_provider", "admin"])
    db = get_db()
    item = await db.menu_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(404, "Item not found")
    kitchen = await db.kitchens.find_one({"_id": ObjectId(item["kitchen_id"])})
    if not kitchen or (str(kitchen.get("owner_id")) != user["id"] and user["role"] != "admin"):
        raise HTTPException(403, "Not authorized")
    await db.menu_items.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Item deleted"}
