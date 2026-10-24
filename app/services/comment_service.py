from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.dal.comment_dal import CommentDAL
from app.dal.post_dal import PostDAL
from app.dal.user_dal import UserDAL
from app.dal.notification_dal import NotificationDAL, NotificationType, NotificationTargetType
from app.models.comment import CommentCreate, CommentUpdate, CommentResponse


class CommentService:
    @staticmethod
    async def create_comment(
        mongo_db: AsyncIOMotorDatabase,
        mysql_db: Session,
        post_id: str,
        author_id: int,
        comment_data: CommentCreate
    ) -> CommentResponse:
        """Create a new comment"""
        # Verify post exists
        post = await PostDAL.get_post_by_id(mongo_db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        comment_id = await CommentDAL.create_comment(mongo_db, post_id, author_id, comment_data)
        
        # Create notification for post author
        if post["author_id"] != author_id:
            NotificationDAL.create_notification(
                mysql_db,
                recipient_id=post["author_id"],
                notifier_id=author_id,
                notif_type=NotificationType.COMMENT,
                target_type=NotificationTargetType.POST,
                target_id=post_id
            )
        
        # Get author info
        author = UserDAL.get_user_by_id(mysql_db, author_id)
        
        from app.utils.time_utils import get_current_timestamp
        now = get_current_timestamp()
        
        return CommentResponse(
            id=comment_id,
            post_id=post_id,
            author_id=author_id,
            author_name=author.name,
            author_role=author.role.value,
            author_image_url=author.image_url,
            content=comment_data.content,
            created_at=now,
            updated_at=now
        )
    
    @staticmethod
    async def get_comments(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, post_id: str, skip: int = 0, limit: int = 50) -> List[CommentResponse]:
        """Get comments for a post"""
        comments = await CommentDAL.get_comments_by_post(mongo_db, post_id, skip, limit)
        return [await CommentService._build_comment_response(mysql_db, comment) for comment in comments]
    
    @staticmethod
    async def update_comment(mongo_db: AsyncIOMotorDatabase, comment_id: str, author_id: int, comment_data: CommentUpdate) -> dict:
        """Update a comment"""
        # Verify ownership
        comment = await CommentDAL.get_comment_by_id(mongo_db, comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        if comment["author_id"] != author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this comment"
            )
        
        success = await CommentDAL.update_comment(mongo_db, comment_id, comment_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update comment"
            )
        
        return {"message": "Comment updated successfully"}
    
    @staticmethod
    async def delete_comment(mongo_db: AsyncIOMotorDatabase, comment_id: str, author_id: int, is_admin: bool = False) -> dict:
        """Delete a comment"""
        # Verify ownership
        comment = await CommentDAL.get_comment_by_id(mongo_db, comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        
        if not is_admin and comment["author_id"] != author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this comment"
            )
        
        success = await CommentDAL.delete_comment(mongo_db, comment_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete comment"
            )
        
        return {"message": "Comment deleted successfully"}
    
    @staticmethod
    async def _build_comment_response(mysql_db: Session, comment: dict) -> CommentResponse:
        """Build comment response with author info"""
        author = UserDAL.get_user_by_id(mysql_db, comment["author_id"])
        
        return CommentResponse(
            id=str(comment["_id"]),
            post_id=comment["post_id"],
            author_id=comment["author_id"],
            author_name=author.name if author else "Unknown",
            author_role=author.role.value if author else "UNKNOWN",
            author_image_url=author.image_url if author else None,
            content=comment["content"],
            created_at=comment["created_at"],
            updated_at=comment["updated_at"]
        )