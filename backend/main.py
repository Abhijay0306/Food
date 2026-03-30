from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Validate critical env vars before anything else ───────────────────────────
import os, logging

_jwt_secret = os.environ.get("JWT_SECRET", "fallback-secret-key-change-in-production")
if _jwt_secret == "fallback-secret-key-change-in-production":
    raise RuntimeError(
        "JWT_SECRET is using the insecure fallback. "
        "Set a strong random string in your .env or environment."
    )

# ── App setup ─────────────────────────────────────────────────────────────────
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import get_db, close_client
from routes.auth import router as auth_router
from routes.kitchens import router as kitchens_router
from routes.orders import router as orders_router
from routes.payments import router as payments_router
from routes.delivery import router as delivery_router
from routes.admin import router as admin_router
from routes.websocket import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="HyperEats API", version="1.0.0")

import traceback
from fastapi.responses import JSONResponse
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "exception": str(exc), "trace": traceback.format_exc()}
    )

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Stayin' alive"}

# ── CORS ──────────────────────────────────────────────────────────────────────
cors_origins_raw = os.environ.get("CORS_ORIGINS", "")
if cors_origins_raw and cors_origins_raw != "*":
    cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
else:
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    cors_origins = [frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "https://food-eta-flax.vercel.app"
    ] + cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api"
app.include_router(auth_router, prefix=PREFIX)
app.include_router(kitchens_router, prefix=PREFIX)
app.include_router(orders_router, prefix=PREFIX)
app.include_router(payments_router, prefix=PREFIX)
app.include_router(delivery_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)

# ── Stripe webhook (raw body needed — must be on app not router) ──────────────
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from stripe_service import stripe_service
    from bson import ObjectId
    from datetime import datetime, timezone

    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        event = stripe_service.handle_webhook(body, sig)
        logger.info(f"Stripe webhook: {event.event_type}, session: {event.session_id}")
        if event.payment_status == "paid":
            db = get_db()
            tx = await db.payment_transactions.find_one({"session_id": event.session_id})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete"}},
                )
                oid = tx.get("order_id")
                if oid:
                    await db.orders.update_one(
                        {"_id": ObjectId(oid), "status": "pending_payment"},
                        {"$set": {"status": "placed", "payment_status": "paid"}},
                    )
                    await ws_manager.broadcast(f"order:{oid}", {"status": "placed"})
    except ValueError as e:
        logger.warning(f"Invalid Stripe signature: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
    return {"status": "ok"}


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/api/ws/orders/{order_id}")
async def ws_orders(websocket: WebSocket, order_id: str):
    await ws_manager.connect(f"order:{order_id}", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(f"order:{order_id}", websocket)


# ── Startup / Shutdown ────────────────────────────────────────────────────────
FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1476005484258-bd38fa5bc155?w=400",
    "https://images.unsplash.com/photo-1764015939108-7963106fa73b?w=400",
    "https://images.unsplash.com/photo-1774106425926-bdbab1356790?w=400",
    "https://images.unsplash.com/photo-1743409390921-1d1e673bc351?w=400",
]

SEED_DATA = [
    {
        "email": "amma@kitchen.com", "name": "Amma", "password": "kitchen123",
        "kitchen": {
            "name": "Amma's Kitchen", "description": "Authentic South Indian home cooking with love",
            "address": "123 MG Road, Downtown", "lat": 40.7580, "lng": -73.9855,
            "cuisine_types": ["South Indian", "Vegetarian"],
            "image_url": "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?w=600",
        },
        "items": [
            {"name": "Masala Dosa", "description": "Crispy rice crepe with spiced potato filling", "price": 8.99, "category": "Main Course"},
            {"name": "Idli Sambar", "description": "Steamed rice cakes with lentil stew", "price": 6.99, "category": "Main Course"},
            {"name": "Chicken Biryani", "description": "Fragrant basmati rice with spiced chicken", "price": 12.99, "category": "Main Course"},
            {"name": "Filter Coffee", "description": "Traditional South Indian filter coffee", "price": 3.49, "category": "Beverages"},
        ],
    },
    {
        "email": "spice@kitchen.com", "name": "Chef Raj", "password": "kitchen123",
        "kitchen": {
            "name": "The Spice Route", "description": "Bold North Indian flavors from a home kitchen",
            "address": "456 Park Avenue, Midtown", "lat": 40.7614, "lng": -73.9776,
            "cuisine_types": ["North Indian", "Mughlai"],
            "image_url": "https://images.pexels.com/photos/4590935/pexels-photo-4590935.jpeg?w=600",
        },
        "items": [
            {"name": "Butter Chicken", "description": "Tender chicken in rich tomato-butter sauce", "price": 13.99, "category": "Main Course"},
            {"name": "Garlic Naan", "description": "Fresh baked flatbread with garlic butter", "price": 3.99, "category": "Breads"},
            {"name": "Dal Makhani", "description": "Creamy black lentils slow-cooked overnight", "price": 9.99, "category": "Main Course"},
            {"name": "Mango Lassi", "description": "Chilled yogurt drink with fresh mango", "price": 4.49, "category": "Beverages"},
        ],
    },
    {
        "email": "green@kitchen.com", "name": "Maya", "password": "kitchen123",
        "kitchen": {
            "name": "Green Bowl", "description": "Fresh, healthy bowls and smoothies made daily",
            "address": "789 Broadway, SoHo", "lat": 40.7234, "lng": -73.9987,
            "cuisine_types": ["Healthy", "Salads", "Vegan"],
            "image_url": "https://images.unsplash.com/photo-1476005484258-bd38fa5bc155?w=600",
        },
        "items": [
            {"name": "Quinoa Power Bowl", "description": "Quinoa with roasted veggies and tahini", "price": 11.99, "category": "Bowls"},
            {"name": "Caesar Salad", "description": "Romaine, croutons, parmesan, house dressing", "price": 9.49, "category": "Salads"},
            {"name": "Acai Smoothie Bowl", "description": "Acai blend topped with granola and berries", "price": 10.99, "category": "Bowls"},
            {"name": "Green Detox Juice", "description": "Spinach, apple, ginger, lemon", "price": 5.99, "category": "Beverages"},
        ],
    },
]


import asyncio
import httpx

async def keep_alive():
    url = "https://hypereats-api.onrender.com/api/health"
    while True:
        await asyncio.sleep(600)  # Ping every 10 minutes
        try:
            async with httpx.AsyncClient() as client:
                await client.get(url, timeout=10.0)
            logger.info("Self-ping successful to prevent Render sleep.")
        except Exception as e:
            logger.error(f"Keep-alive ping failed: {e}")

@app.on_event("startup")
async def startup():
    asyncio.create_task(keep_alive())
    from utils import hash_password, verify_password
    from datetime import datetime, timezone

    db = get_db()
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.kitchens.create_index("owner_id")
    await db.menu_items.create_index("kitchen_id")
    await db.orders.create_index("customer_id")
    await db.orders.create_index("kitchen_id")
    await db.orders.create_index("status")                       # NEW: status queries
    await db.orders.create_index("delivery_agent_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.reviews.create_index("order_id", unique=True)
    await db.reviews.create_index("kitchen_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "phone": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed kitchens
    for idx, data in enumerate(SEED_DATA):
        if not await db.users.find_one({"email": data["email"]}):
            result = await db.users.insert_one({
                "email": data["email"],
                "password_hash": hash_password(data["password"]),
                "name": data["name"],
                "role": "kitchen_provider",
                "phone": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            owner_id = str(result.inserted_id)
            kitchen_doc = {
                **data["kitchen"],
                "owner_id": owner_id,
                "is_open": True,
                "rating": 4.2 + idx * 0.2,
                "total_orders": 10 + idx * 5,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            k_result = await db.kitchens.insert_one(kitchen_doc)
            kitchen_id = str(k_result.inserted_id)
            for i, item in enumerate(data["items"]):
                await db.menu_items.insert_one({
                    **item,
                    "kitchen_id": kitchen_id,
                    "image_url": FOOD_IMAGES[i % len(FOOD_IMAGES)],
                    "is_available": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            logger.info(f"Seeded kitchen: {data['kitchen']['name']}")

    # Seed delivery agents
    for d in [
        {"email": "driver1@delivery.com", "name": "Alex Driver"},
        {"email": "driver2@delivery.com", "name": "Sam Courier"},
    ]:
        if not await db.users.find_one({"email": d["email"]}):
            await db.users.insert_one({
                "email": d["email"],
                "password_hash": hash_password("delivery123"),
                "name": d["name"],
                "role": "delivery_agent",
                "phone": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Seeded delivery agent: {d['name']}")

    logger.info("🚀 HyperEats API startup complete")


@app.on_event("shutdown")
async def shutdown():
    await close_client()
