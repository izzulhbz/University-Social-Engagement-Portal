from pydantic import BaseModel
from typing import Optional

class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    pass


class CommentUpdate(CommentBase):
    pass


class CommentResponse(CommentBase):
    id: str
    post_id: str
    author_id: int
    author_name: str
    author_role: str
    author_image_url: Optional[str] = None
    created_at: int
    updated_at: int