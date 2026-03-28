from math import radians, cos, sin, asin, sqrt
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os, bcrypt, jwt

# ── JWT ──────────────────────────────────────────────────────────────────────

JWT_SECRET: str = os.environ.get("JWT_SECRET", "")
JWT_ALG = "HS256"


def _assert_jwt_secret() -> str:
    """Raise at startup if JWT_SECRET is missing or is the insecure fallback."""
    secret = os.environ.get("JWT_SECRET", "")
    if not secret or secret == "fallback-secret-key-change-in-production":
        raise RuntimeError(
            "JWT_SECRET environment variable is not set or is using the insecure "
            "fallback value. Set a strong random string before starting the server."
        )
    return secret


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=2),
            "type": "access",
        },
        get_jwt_secret(),
        algorithm=JWT_ALG,
    )


def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {
            "sub": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "type": "refresh",
        },
        get_jwt_secret(),
        algorithm=JWT_ALG,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])


# ── Geo ───────────────────────────────────────────────────────────────────────

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


# ── Mongo helpers ─────────────────────────────────────────────────────────────

def doc_to_dict(doc: dict) -> dict:
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for key in list(doc.keys()):
        if isinstance(doc[key], ObjectId):
            doc[key] = str(doc[key])
        elif isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    return doc
