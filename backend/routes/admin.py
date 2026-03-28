from fastapi import APIRouter, Request, Body, HTTPException
from bson import ObjectId
from typing import Optional
from db import get_db
from utils import doc_to_dict
from routes.auth import require_role

router = APIRouter(prefix="/admin")


@router.get("/users")
async def admin_users(request: Request, role: Optional[str] = None):
    await require_role(request, ["admin"])
    db = get_db()
    query = {"role": role} if role else {}
    users = await db.users.find(query, {"password_hash": 0}).to_list(1000)
    return [doc_to_dict(u) for u in users]


@router.get("/analytics")
async def admin_analytics(request: Request):
    await require_role(request, ["admin"])
    db = get_db()
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_kitchens = await db.kitchens.count_documents({})
    total_agents = await db.users.count_documents({"role": "delivery_agent"})

    pipeline = [{"$match": {"payment_status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    rev = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = rev[0]["total"] if rev else 0

    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    statuses = await db.orders.aggregate(status_pipeline).to_list(20)
    orders_by_status = {s["_id"]: s["count"] for s in statuses}

    recent = await db.orders.find().sort("created_at", -1).to_list(10)
    return {
        "total_orders": total_orders,
        "total_users": total_users,
        "total_kitchens": total_kitchens,
        "total_agents": total_agents,
        "total_revenue": round(total_revenue, 2),
        "orders_by_status": orders_by_status,
        "recent_orders": [doc_to_dict(o) for o in recent],
    }


@router.put("/orders/{order_id}/assign")
async def assign_delivery(order_id: str, request: Request, agent_id: str = Body(..., embed=True)):
    await require_role(request, ["admin"])
    db = get_db()
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(404, "Order not found")
    agent = await db.users.find_one({"_id": ObjectId(agent_id), "role": "delivery_agent"})
    if not agent:
        raise HTTPException(404, "Delivery agent not found")
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"delivery_agent_id": str(agent["_id"]), "delivery_agent_name": agent["name"]}},
    )
    return {"message": "Delivery agent assigned"}
