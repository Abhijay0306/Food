from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone
from db import get_db
from utils import doc_to_dict
from routes.auth import require_role

router = APIRouter(prefix="/delivery")


@router.get("/orders")
async def delivery_orders(request: Request):
    user = await require_role(request, ["delivery_agent", "admin"])
    db = get_db()
    orders = await db.orders.find({"delivery_agent_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [doc_to_dict(o) for o in orders]


@router.get("/available")
async def available_deliveries(request: Request):
    await require_role(request, ["delivery_agent", "admin"])
    db = get_db()
    orders = await db.orders.find({
        "status": "ready",
        "$or": [{"delivery_agent_id": None}, {"delivery_agent_id": ""}],
    }).to_list(100)
    return [doc_to_dict(o) for o in orders]


@router.put("/orders/{order_id}/accept")
async def accept_delivery(order_id: str, request: Request):
    user = await require_role(request, ["delivery_agent"])
    db = get_db()

    # Prevent double-booking: agent can only have one active delivery at a time
    active = await db.orders.find_one({
        "delivery_agent_id": user["id"],
        "status": {"$in": ["picked_up", "ready"]},
    })
    if active:
        raise HTTPException(400, "You already have an active delivery. Complete it before accepting another.")

    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["status"] != "ready":
        raise HTTPException(400, "Order not ready for pickup")
    if order.get("delivery_agent_id") and order["delivery_agent_id"] not in [None, ""]:
        raise HTTPException(400, "Order already claimed by another agent")

    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"delivery_agent_id": user["id"], "delivery_agent_name": user["name"]}},
    )
    return {"message": "Delivery accepted"}
