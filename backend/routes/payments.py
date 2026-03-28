from fastapi import APIRouter, Request
from bson import ObjectId
from datetime import datetime, timezone
from db import get_db
from utils import doc_to_dict
import os, logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/payments/status/{session_id}")
async def check_payment(session_id: str, request: Request):
    from stripe_service import stripe_service
    db = get_db()
    status = await stripe_service.get_checkout_status(session_id)
    tx = await db.payment_transactions.find_one({"session_id": session_id})

    if tx and tx.get("payment_status") != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": status.status}},
        )
        order_id = tx.get("order_id")
        if order_id:
            await db.orders.update_one(
                {"_id": ObjectId(order_id), "status": "pending_payment"},
                {"$set": {"status": "placed", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            from routes.websocket import ws_manager
            await ws_manager.broadcast(f"order:{order_id}", {"status": "placed"})
    elif tx and status.payment_status != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status}},
        )

    order_id = tx.get("order_id") if tx else None
    return {"payment_status": status.payment_status, "status": status.status, "order_id": order_id}


# Stripe webhook is registered directly on app (not api router) — kept in main.py
