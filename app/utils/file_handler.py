# app/utils/file_handler.py
import os
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
import uuid

# Base directory for uploads
UPLOAD_DIR = Path("static/uploads")
PROFILE_DIR = UPLOAD_DIR / "profile"
POSTS_DIR = UPLOAD_DIR / "posts"

# Allowed image extensions
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def init_upload_directories():
    """Create upload directories if they don't exist"""
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)


def validate_image_file(file: UploadFile) -> bool:
    """Validate image file extension"""
    if not file.filename:
        return False
    
    ext = Path(file.filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    ext = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex
    return f"{unique_id}{ext}"


async def save_profile_image(file: UploadFile) -> str:
    """
    Save profile image and return URL path
    Returns: /static/uploads/profile/filename.ext
    """
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PNG, JPG, and JPEG are allowed."
        )
    
    # Generate unique filename
    filename = generate_unique_filename(file.filename)
    file_path = PROFILE_DIR / filename
    
    try:
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL path
        return f"/static/uploads/profile/{filename}"
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        await file.close()


async def save_post_image(file: UploadFile) -> str:
    """
    Save post image and return URL path
    Returns: /static/uploads/posts/filename.ext
    """
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PNG, JPG, and JPEG are allowed."
        )
    
    # Generate unique filename
    filename = generate_unique_filename(file.filename)
    file_path = POSTS_DIR / filename
    
    try:
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL path
        return f"/static/uploads/posts/{filename}"
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        await file.close()


def delete_file(file_path: str) -> bool:
    """Delete a file given its URL path"""
    try:
        # Convert URL path to file path
        # /static/uploads/profile/abc.jpg -> static/uploads/profile/abc.jpg
        if file_path.startswith("/static/"):
            file_path = file_path[1:]  # Remove leading /
        
        full_path = Path(file_path)
        if full_path.exists():
            full_path.unlink()
            return True
        return False
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False