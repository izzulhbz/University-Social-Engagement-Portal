from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorDatabase
from contextlib import asynccontextmanager

from app.config import settings
from app.dal.mysql_dal import engine, Base
from app.dal.mongodb_dal import MongoDBConnection, get_mongodb

from app.routers.admin import router as admin_router
from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.comments import router as comments_router
from app.routers.connections import router as connections_router
from app.routers.notifications import router as notifications_router
from app.routers.posts import router as posts_router
from app.routers.users import router as users_router

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Running startup logic...")

    # Create MySQL tables 
    Base.metadata.create_all(bind=engine)

    # Connect to MongoDB 
    await MongoDBConnection.connect()

    # Create MongoDB indexes
    db: AsyncIOMotorDatabase = MongoDBConnection.get_database()
    await db.posts.create_index("author_id")
    await db.posts.create_index("created_at")
    await db.comments.create_index("post_id")
    await db.comments.create_index("author_id")

    # Initialize upload directories
    from app.utils.file_handler import init_upload_directories

    init_upload_directories()

    print("Startup complete. Databases initialized.")

    # Application is ready to handle requests
    yield

    # Shutdown logic
    print("Running shutdown logic: Disconnecting from MongoDB...")
    await MongoDBConnection.disconnect()
    print("Shutdown complete.")

# Create FastAPI app, passing the lifespan function
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan, 
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],  # In production, specify actual origins
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",  # Live Server
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    """Health check endpoint"""
    return {"message": "University Social Engagement Portal API is running", "version": "1.0.0"}

app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(auth_router)
app.include_router(comments_router)
app.include_router(connections_router)
app.include_router(notifications_router)
app.include_router(posts_router)
app.include_router(users_router)
