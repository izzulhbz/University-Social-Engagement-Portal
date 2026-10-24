from pydantic import BaseModel
from typing import Optional


class PostBase(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None


class PostResponse(PostBase):
    id: str
    author_id: int
    author_name: str
    author_role: str
    author_image_url: Optional[str] = None
    comment_count: int = 0
    created_at: int
    updated_at: int