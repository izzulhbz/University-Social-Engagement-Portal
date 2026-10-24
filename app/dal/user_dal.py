from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from typing import Optional, List
from app.models.user import UserCreate, UserUpdate, UserRole
from app.utils.security import get_password_hash
from app.utils.time_utils import get_current_timestamp


# SQLAlchemy ORM Models
from sqlalchemy import Column, Integer, String, BigInteger, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.dal.mysql_dal import Base


class UserORM(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    bio = Column(String(255))
    role = Column(SQLEnum(UserRole), nullable=False)
    image_url = Column(String(255))
    hashed_password = Column(String(100), nullable=False)
    last_login_at = Column(BigInteger)
    created_at = Column(BigInteger, nullable=False)
    updated_at = Column(BigInteger)
    
    # Relationships
    student = relationship("StudentORM", back_populates="user", uselist=False, cascade="all, delete-orphan")
    faculty = relationship("FacultyORM", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin = relationship("AdminORM", back_populates="user", uselist=False, cascade="all, delete-orphan")


class StudentORM(Base):
    __tablename__ = "student"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    course = Column(String(100))
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    user = relationship("UserORM", back_populates="student")


class FacultyORM(Base):
    __tablename__ = "faculty"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    academic_position = Column(String(100))
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    user = relationship("UserORM", back_populates="faculty")


class AdminORM(Base):
    __tablename__ = "admin"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_title = Column(String(100))
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    user = relationship("UserORM", back_populates="admin")


# Data Access Layer Functions
class UserDAL:
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> UserORM:
        """Create a new user"""
        now = get_current_timestamp()
        
        # Create user
        db_user = UserORM(
            email=user_data.email,
            name=user_data.name,
            bio=user_data.bio,
            role=user_data.role,
            image_url=user_data.image_url,
            hashed_password=get_password_hash(user_data.password),
            created_at=now
        )
        db.add(db_user)
        db.flush()  # Get the user ID
        
        # Create role specific record
        if user_data.role == UserRole.STUDENT:
            student = StudentORM(user_id=db_user.id, course=user_data.course)
            db.add(student)
        elif user_data.role == UserRole.FACULTY:
            faculty = FacultyORM(user_id=db_user.id, academic_position=user_data.academic_position)
            db.add(faculty)
        elif user_data.role == UserRole.ADMIN:
            admin = AdminORM(user_id=db_user.id, job_title=user_data.job_title)
            db.add(admin)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[UserORM]:
        """Get user by ID"""
        return db.query(UserORM).filter(UserORM.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[UserORM]:
        """Get user by email"""
        return db.query(UserORM).filter(UserORM.email == email).first()
    
    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[UserORM]:
        """Get all users with pagination"""
        return db.query(UserORM).offset(skip).limit(limit).all()
    
    @staticmethod
    def search_users(db: Session, query: str, current_user_id: int) -> List[UserORM]:
        """Search users by name or email (exclude current user)"""
        search_pattern = f"%{query}%"
        return db.query(UserORM).filter(
            UserORM.id != current_user_id,
            or_(
                UserORM.name.ilike(search_pattern),
                UserORM.email.ilike(search_pattern)
            )
        ).all()
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdate) -> Optional[UserORM]:
        """Update user information"""
        db_user = UserDAL.get_user_by_id(db, user_id)
        if not db_user:
            return None
        
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Update user fields
        for field, value in update_data.items():
            if field in ['course', 'academic_position', 'job_title']:
                continue  # Handle role specific fields separately
            if hasattr(db_user, field):
                setattr(db_user, field, value)
        
        db_user.updated_at = get_current_timestamp()
        
        # Update role specific fields
        if 'course' in update_data and db_user.student:
            db_user.student.course = update_data['course']
        if 'academic_position' in update_data and db_user.faculty:
            db_user.faculty.academic_position = update_data['academic_position']
        if 'job_title' in update_data and db_user.admin:
            db_user.admin.job_title = update_data['job_title']
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def update_password(db: Session, user_id: int, new_password: str) -> bool:
        """Update user password"""
        db_user = UserDAL.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        db_user.hashed_password = get_password_hash(new_password)
        db_user.updated_at = get_current_timestamp()
        db.commit()
        return True
    
    @staticmethod
    def update_last_login(db: Session, user_id: int) -> None:
        """Update last login timestamp"""
        db_user = UserDAL.get_user_by_id(db, user_id)
        if db_user:
            db_user.last_login_at = get_current_timestamp()
            db.commit()
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete user (cascade deletes role-specific records)"""
        db_user = UserDAL.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        db.delete(db_user)
        db.commit()
        return True
    
    @staticmethod
    def count_users_by_role(db: Session, role: Optional[UserRole] = None) -> int:
        """Count users by role"""
        query = db.query(func.count(UserORM.id))
        if role:
            query = query.filter(UserORM.role == role)
        return query.scalar()
    
    @staticmethod
    def count_active_users(db: Session, start_time: int, end_time: int) -> dict:
        """Count active users (who logged in) within time range, grouped by role"""
        results = db.query(
            UserORM.role,
            func.count(UserORM.id)
        ).filter(
            UserORM.last_login_at >= start_time,
            UserORM.last_login_at <= end_time
        ).group_by(UserORM.role).all()
        
        return {role: count for role, count in results}