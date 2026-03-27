from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Annotated, List
from datetime import timedelta

# Import our other files
import models, schemas, security
from database import SessionLocal, engine

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods
    allow_headers=["*"], # Allow all headers
)

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Security Dependency ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# This function gets the current user from their token
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# This function checks if the user is a DMT admin
async def get_dmt_user(current_user: Annotated[models.User, Depends(get_current_user)]):
    if current_user.role != "dmt":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Operation not permitted"
        )
    return current_user

# --- API Endpoints ---

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], 
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(
    current_user: Annotated[models.User, Depends(get_current_user)]
):
    # This endpoint is protected. It only runs if the token is valid.
    return current_user

# --- DMT-Only Endpoints ---

@app.post("/users/create", response_model=schemas.UserResponse)
async def create_new_user(
    user_to_create: schemas.UserCreate,
    # This dependency ensures ONLY a DMT user can run this
    dmt_user: Annotated[models.User, Depends(get_dmt_user)], 
    db: Session = Depends(get_db)
):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user_to_create.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the new password
    hashed_password = security.get_password_hash(user_to_create.password)
    
    # Create the new user model
    new_user = models.User(
        email=user_to_create.email,
        password_hash=hashed_password,
        role=user_to_create.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.get("/users", response_model=List[schemas.UserResponse])
async def get_all_users(
    # This dependency ensures ONLY a DMT user can run this
    dmt_user: Annotated[models.User, Depends(get_dmt_user)],
    db: Session = Depends(get_db)
):
    users = db.query(models.User).all()
    return users