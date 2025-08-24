"""
Authentication routes for login, register, and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from ..models import User
from .schemas import UserCreate, UserOut, Token
from .security import verify_password, get_password_hash, create_access_token
from .dependencies import get_current_user
from ..config import DATABASE_URL

# Database setup (using same DB as main app)
engine = create_engine(DATABASE_URL)

def get_db():
    """Database dependency"""
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/auth", tags=["authentication"])

def get_user_by_email(db: Session, email: str) -> User:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user"""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> User:
    """Authenticate a user"""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login endpoint"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserOut)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (only if no users exist or admin creates)"""
    # Check if any users exist
    user_count = db.query(User).count()
    
    # If no users exist, allow admin creation
    if user_count == 0:
        user_data.role = "admin"
    else:
        # For now, prevent registration if users exist
        # In production, add admin-only check here
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is not allowed. Contact administrator."
        )
    
    # Check if user already exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = create_user(db, user_data)
    return user

@router.get("/me", response_model=UserOut)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user
