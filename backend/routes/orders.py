from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
from db import get_db
from utils import doc_to_dict
from models import OrderCreate, StatusUpdate, ReviewCreate
from routes.auth import get_current_user, require_role
import os, logging

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_TRANSITIONS = {
    "placed": ["accepted", "rejected"],
    "accepted": ["preparing"],
    "preparing": ["ready"],
    "ready": ["picked_up"],
    "picked_up": ["delivered"],
}


@router.post("/orders")
async def create_order(req: OrderCreate, request: Request):
    user = await require_role(request, ["customer"])
    db = get_db()
    kitchen = await db.kitchens.find_one({"_id": ObjectId(req.kitchen_id)})
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    if not kitchen.get("is_open", True):
        raise HTTPException(400, "Kitchen is currently closed")

    menu_item_ids = [ObjectId(item.menu_item_id) for item in req.items]
    menu_items_cursor = await db.menu_items.find(
        {"_id": {"$in": menu_item_ids}},
        {"name": 1, "price": 1, "image_url": 1, "is_available": 1},
    ).to_list(len(menu_item_ids))
    menu_items_map = {str(mi["_id"]): mi for mi in menu_items_cursor}

    order_items = []
    total = 0.0
    for item in req.items:
        mi = menu_items_map.get(item.menu_item_id)
        if not mi:
            raise HTTPException(404, "Menu item not found")
        if not mi.get("is_available", True):
            raise HTTPException(400, f"{mi['name']} is not available")
        qty = max(1, min(50, item.quantity))
        order_items.append({
            "menu_item_id": item.menu_item_id,
            "name": mi["name"],
            "price": mi["price"],
            "quantity": qty,
            "image_url": mi.get("image_url", ""),
        })
        total += mi["price"] * qty

    total = round(total, 2)
    order_doc = {
        "customer_id": user["id"],
        "customer_name": user["name"],
        "customer_email": user.get("email", ""),
        "kitchen_id": req.kitchen_id,
        "kitchen_name": kitchen["name"],
        "kitchen_lat": kitchen.get("lat"),
        "kitchen_lng": kitchen.get("lng"),
        "items": order_items,
        "total": total,
        "delivery_address": req.delivery_address,
        "status": "pending_payment",
        "payment_status": "pending",
        "delivery_agent_id": None,
        "delivery_agent_name": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)

    # Stripe checkout session
    from stripe_service import stripe_service
    success_url = f"{req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/cart"
    session = await stripe_service.create_checkout_session(
        amount=float(total),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id, "customer_email": user.get("email", "")},
    )
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "order_id": order_id,
        "amount": total,
        "currency": "usd",
        "payment_status": "initiated",
        "customer_id": user["id"],
        "customer_email": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "order_id": order_id, "session_id": session.session_id}


@router.get("/orders")
async def list_orders(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    db = get_db()
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["id"]
    elif user["role"] == "kitchen_provider":
        kitchens = await db.kitchens.find({"owner_id": user["id"]}).to_list(100)
        kitchen_ids = [str(k["_id"]) for k in kitchens]
        query["kitchen_id"] = {"$in": kitchen_ids}
    elif user["role"] == "delivery_agent":
        query["delivery_agent_id"] = user["id"]

    if status:
        if status == "active":
            query["status"] = {"$in": ["placed", "accepted", "preparing", "ready", "picked_up"]}
        else:
            query["status"] = status

    orders = await db.orders.find(query, {
        "customer_id": 1, "customer_name": 1, "kitchen_id": 1, "kitchen_name": 1,
        "items": 1, "total": 1, "status": 1, "payment_status": 1,
        "delivery_agent_id": 1, "delivery_agent_name": 1, "delivery_address": 1,
        "created_at": 1, "updated_at": 1,
    }).sort("created_at", -1).limit(50).to_list(50)
    return [doc_to_dict(o) for o in orders]


@router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
        
    # Security: Verify ownership
    if user["role"] == "customer" and order.get("customer_id") != user["id"]:
        raise HTTPException(403, "Not authorized to view this order")
    if user["role"] == "kitchen_provider":
        kitchen = await db.kitchens.find_one({"_id": ObjectId(order.get("kitchen_id"))})
        if not kitchen or str(kitchen.get("owner_id")) != user["id"]:
            raise HTTPException(403, "Not authorized to view this order")
    if user["role"] == "delivery_agent" and order.get("delivery_agent_id") != user["id"]:
        raise HTTPException(403, "Not authorized to view this order")
        
    return doc_to_dict(order)


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, req: StatusUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")

    current = order["status"]
    new_status = req.status
    valid = VALID_TRANSITIONS.get(current, [])
    if new_status not in valid:
        raise HTTPException(400, f"Cannot transition from {current} to {new_status}")

    # Kitchen actions — verify caller owns this kitchen
    if new_status in ["accepted", "rejected", "preparing", "ready"]:
        if user["role"] not in ["kitchen_provider", "admin"]:
            raise HTTPException(403, "Only kitchen can update this status")
        if user["role"] == "kitchen_provider":
            kitchen = await db.kitchens.find_one({"_id": ObjectId(order["kitchen_id"])})
            if not kitchen or str(kitchen.get("owner_id")) != user["id"]:
                raise HTTPException(403, "You do not own this kitchen")

    # Delivery actions — verify caller is assigned to this order
    if new_status in ["picked_up", "delivered"]:
        if user["role"] not in ["delivery_agent", "admin"]:
            raise HTTPException(403, "Only delivery agent can update this status")
        if user["role"] == "delivery_agent":
            if order.get("delivery_agent_id") != user["id"]:
                raise HTTPException(403, "You are not assigned to this order")

    update_data = {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update_data})

    # Broadcast via WebSocket
    from routes.websocket import ws_manager
    await ws_manager.broadcast(f"order:{order_id}", {"status": new_status, "updated_at": update_data["updated_at"]})

    if new_status == "delivered":
        await db.kitchens.update_one({"_id": ObjectId(order["kitchen_id"])}, {"$inc": {"total_orders": 1}})

    return {"message": f"Order updated to {new_status}"}


@router.post("/reviews")
async def submit_review(req: ReviewCreate, request: Request):
    user = await require_role(request, ["customer"])
    db = get_db()

    order = await db.orders.find_one({"_id": ObjectId(req.order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["customer_id"] != user["id"]:
        raise HTTPException(403, "Not your order")
    if order["status"] != "delivered":
        raise HTTPException(400, "Order is not delivered yet")

    # Upsert review (one review per order)
    await db.reviews.update_one(
        {"order_id": req.order_id},
        {"$set": {
            "order_id": req.order_id,
            "kitchen_id": req.kitchen_id,
            "customer_id": user["id"],
            "customer_name": user["name"],
            "rating": req.rating,
            "comment": req.comment,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    # Update kitchen rolling average rating
    pipeline = [
        {"$match": {"kitchen_id": req.kitchen_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        new_rating = round(result[0]["avg"], 2)
        await db.kitchens.update_one(
            {"_id": ObjectId(req.kitchen_id)},
            {"$set": {"rating": new_rating}},
        )

    return {"message": "Review submitted", "rating": req.rating}
