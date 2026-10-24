from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

class MongoDBConnection:
    client: AsyncIOMotorClient = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB"""
        cls.client = AsyncIOMotorClient(settings.MONGO_DB_URI)
    
    @classmethod
    async def disconnect(cls):
        """Disconnect from MongoDB"""
        if cls.client:
            cls.client.close()
    
    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get MongoDB database"""
        return cls.client[settings.MONGO_DB_DATABASE_NAME]


async def get_mongodb() -> AsyncIOMotorDatabase:
    """Dependency for getting MongoDB database"""
    return MongoDBConnection.get_database()