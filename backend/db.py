from motor.motor_asyncio import AsyncIOMotorClient
import os

_client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            os.environ["MONGO_URL"],
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
    return _client

def get_db():
    return get_client()[os.environ["DB_NAME"]]

async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None
