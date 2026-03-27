from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

# --- Configuration ---
# !! Use a strong, random string in production !!
SECRET_KEY = "your-very-secret-key-for-jwt"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Access token is short-lived

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# --- JWT Token Creation ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    # 'sub' is the standard name for the token's "subject" (who it's about)
    # 'role' is a custom claim we add
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Add these imports at the TOP of security.py ---
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

# --- This defines the URL FastAPI will check to get a token ---
# !! Change "token" to your actual login endpoint URL (e.g., "/login") !!
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- A Pydantic model to define the data inside the token ---
class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None # Matches the 'role' you added in create_access_token


# --- THIS IS THE MISSING FUNCTION ---

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency function to decode, verify, and return the 
    current user's data from a JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using your SECRET_KEY and ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # The 'sub' (subject) claim is used for the username
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
        role: str = payload.get("role")
        
        # Store the data in your Pydantic model
        token_data = TokenData(username=username, role=role)
        
    except JWTError:
        # This catches any error from 'jwt.decode'
        # (e.g., token expired, invalid signature)
        raise credentials_exception
    
    # --- Optional: Get user from database ---
    # In a real app, you would now fetch the user from your database
    # to ensure they still exist and are active.
    #
    # user = db.get_user(username=token_data.username)
    # if user is None:
    #     raise credentials_exception
    # return user
    #
    # --- End Optional ---

    # For now, just return the data extracted from the token
    return token_data

def get_dmt_user(current_user: TokenData = Depends(get_current_user)):
    """
    Dependency function to get the current user,
    and then verify they have the 'dmt' role.
    """
    
    # Check if the role from the token is 'dmt'
    # (This is case-sensitive!)
    if current_user.role != "dmt":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized: Requires DMT role",
        )
        
    # If they have the correct role, return the user
    return current_user