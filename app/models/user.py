from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"


class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    role: UserRole
    image_url: Optional[str] = None


class UserCreate(UserBase):
    password: str
    course: Optional[str] = None  # For students
    academic_position: Optional[str] = None  # For faculty
    job_title: Optional[str] = None  # For admin


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    course: Optional[str] = None
    academic_position: Optional[str] = None
    job_title: Optional[str] = None


class UserResponse(UserBase):
    id: int
    last_login_at: Optional[int] = None
    created_at: int
    updated_at: Optional[int] = None
    course: Optional[str] = None
    academic_position: Optional[str] = None
    job_title: Optional[str] = None

    class Config:
        from_attributes = True












