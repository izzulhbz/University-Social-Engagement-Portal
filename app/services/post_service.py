from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.dal.post_dal import PostDAL
from app.dal.comment_dal import CommentDAL
from app.dal.user_dal import UserDAL
from app.dal.connection_dal import ConnectionDAL
from app.models.post import PostCreate, PostUpdate, PostResponse

class PostService:
    @staticmethod
    async def create_post(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, author_id: int, post_data: PostCreate) -> PostResponse:
        """Create a new post"""
        post_id = await PostDAL.create_post(mongo_db, author_id, post_data)
        
        # Get author info
        author = UserDAL.get_user_by_id(mysql_db, author_id)
        
        from app.utils.time_utils import get_current_timestamp
        now = get_current_timestamp()
        
        return PostResponse(
            id=post_id,
            author_id=author_id,
            author_name=author.name,
            author_role=author.role.value,
            author_image_url=author.image_url,
            title=post_data.title,
            content=post_data.content,
            image_url=post_data.image_url,
            comment_count=0,
            created_at=now,
            updated_at=now
        )
    
    @staticmethod
    async def get_post(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, post_id: str) -> PostResponse:
        """Get a single post"""
        post = await PostDAL.get_post_by_id(mongo_db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        return await PostService._build_post_response(mongo_db, mysql_db, post)
    
    @staticmethod
    async def get_user_posts(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[PostResponse]:
        """Get posts by a specific user"""
        posts = await PostDAL.get_posts_by_author(mongo_db, user_id, skip, limit)
        return [await PostService._build_post_response(mongo_db, mysql_db, post) for post in posts]
    
    @staticmethod
    async def get_feed(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[PostResponse]:
        """Get news feed (posts from user and their connections)"""
        # Get connected user IDs
        connected_ids = ConnectionDAL.get_connected_user_ids(mysql_db, user_id)
        
        # Include the current user's posts
        all_author_ids = [user_id] + connected_ids
        
        posts = await PostDAL.get_posts_by_authors(mongo_db, all_author_ids, skip, limit)
        return [await PostService._build_post_response(mongo_db, mysql_db, post) for post in posts]
    
    @staticmethod
    async def update_post(mongo_db: AsyncIOMotorDatabase, post_id: str, author_id: int, post_data: PostUpdate) -> dict:
        """Update a post"""
        # Verify ownership
        post = await PostDAL.get_post_by_id(mongo_db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        if post["author_id"] != author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this post"
            )
        
        success = await PostDAL.update_post(mongo_db, post_id, post_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update post"
            )
        
        return {"message": "Post updated successfully"}
    
    @staticmethod
    async def delete_post(mongo_db: AsyncIOMotorDatabase, post_id: str, author_id: int, is_admin: bool = False) -> dict:
        """Delete a post"""
        # Verify ownership 
        post = await PostDAL.get_post_by_id(mongo_db, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        if not is_admin and post["author_id"] != author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this post"
            )
        
        success = await PostDAL.delete_post(mongo_db, post_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete post"
            )
        
        return {"message": "Post deleted successfully"}
    
    @staticmethod
    async def _build_post_response(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, post: dict) -> PostResponse:
        """Build post response with author info and comment count"""
        author = UserDAL.get_user_by_id(mysql_db, post["author_id"])
        comment_count = await CommentDAL.count_comments_by_post(mongo_db, str(post["_id"]))
        
        return PostResponse(
            id=str(post["_id"]),
            author_id=post["author_id"],
            author_name=author.name if author else "Unknown",
            author_role=author.role.value if author else "UNKNOWN",
            author_image_url=author.image_url if author else None,
            title=post.get("title", ""),
            content=post["content"],
            image_url=post.get("image_url"),
            comment_count=comment_count,
            created_at=post["created_at"],
            updated_at=post["updated_at"]
        )


