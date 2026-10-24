from app.models.post import PostCreate, PostUpdate
from app.services.post_service import PostService
from fastapi import APIRouter, Depends, Form, File, UploadFile

from app.dependencies import get_current_user
from app.dal.mysql_dal import get_db
from app.dal.mongodb_dal import get_mongodb
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post("/")
async def create_post(
    content: str = Form(...),
    title: str = Form(None),
    image: UploadFile = File(None),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new post with optional image upload"""
    image_url = None
    if image and image.filename:
        from app.utils.file_handler import save_post_image
        image_url = await save_post_image(image)
    
    from app.models.post import PostCreate
    post_data = PostCreate(
        title=title or content[:50],
        content=content,
        image_url=image_url
    )
    
    return await PostService.create_post(mongo_db, mysql_db, current_user.id, post_data)

@router.get("/feed")
async def get_feed(
    skip: int = 0,
    limit: int = 20,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get news feed (posts from user and connections)"""
    return await PostService.get_feed(mongo_db, mysql_db, current_user.id, skip, limit)


@router.get("/user/{user_id}")
async def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get posts by a specific user"""
    return await PostService.get_user_posts(mongo_db, mysql_db, user_id, skip, limit)


@router.get("/{post_id}")
async def get_post(
    post_id: str,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single post"""
    return await PostService.get_post(mongo_db, mysql_db, post_id)


@router.put("/{post_id}")
async def update_post(
    post_id: str,
    content: str = Form(None),
    title: str = Form(None),
    image: UploadFile = File(None),
    remove_image: bool = Form(False),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user = Depends(get_current_user)
):
    """Update a post"""
    from app.models.post import PostUpdate
    
    update_data = {}
    if content:
        update_data["content"] = content
    if title:
        update_data["title"] = title
    
    if remove_image:
        update_data["image_url"] = None
    elif image and image.filename:
        from app.utils.file_handler import save_post_image
        image_url = await save_post_image(image)
        update_data["image_url"] = image_url
    
    post_data = PostUpdate(**update_data)
    return await PostService.update_post(mongo_db, post_id, current_user.id, post_data)

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user=Depends(get_current_user),
):
    """Delete a post"""
    is_admin = current_user.role.value == "ADMIN"
    return await PostService.delete_post(mongo_db, post_id, current_user.id, is_admin)
