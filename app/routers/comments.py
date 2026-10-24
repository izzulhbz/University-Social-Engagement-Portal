from app.models.comment import CommentCreate, CommentUpdate
from app.services.comment_service import CommentService
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.dal.mysql_dal import get_db
from app.dal.mongodb_dal import get_mongodb
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="", tags=["comments"])


@router.post("/api/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a comment on a post"""
    return await CommentService.create_comment(mongo_db, mysql_db, post_id, current_user.id, comment_data)


@router.get("/api/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    skip: int = 0,
    limit: int = 50,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get comments for a post"""
    return await CommentService.get_comments(mongo_db, mysql_db, post_id, skip, limit)


@router.put("/api/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user = Depends(get_current_user)
):
    """Update a comment"""
    return await CommentService.update_comment(mongo_db, comment_id, current_user.id, comment_data)


@router.delete("/api/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user = Depends(get_current_user)
):
    """Delete a comment"""
    is_admin = current_user.role.value == "ADMIN"
    return await CommentService.delete_comment(mongo_db, comment_id, current_user.id, is_admin)
