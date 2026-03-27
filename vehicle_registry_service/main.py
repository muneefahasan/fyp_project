from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Annotated
from datetime import date
import re


import models, schemas, security # security.py is needed for get_current_user
from database import SessionLocal, engine
from models import Vehicle

# This is the same function from auth-service,
# just copied here so we can read the token
from security import get_current_user 

# Create all tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- Add CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Security Dependency ---
# This dependency protects an endpoint and checks if the
# user is 'police' or 'dmt'
async def get_police_or_dmt_user(
    current_user: Annotated[models.User, Depends(get_current_user)]
):
    if current_user.role not in ("police", "dmt"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Operation not permitted"
        )
    return current_user

# --- API Endpoints ---

@app.get("/vehicles/{plate_number}", response_model=schemas.VehicleResponse)
async def get_vehicle_details(
    plate_number: str,
    # This protects the endpoint so only police/dmt can use it
    current_user: Annotated[models.User, Depends(get_police_or_dmt_user)],
    db: Session = Depends(get_db)
):
    # Clean the input plate number (remove spaces, convert to uppercase)
    cleaned_plate = re.sub(r'[^A-Za-z0-9]', '', plate_number).upper()

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == cleaned_plate).first()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # --- The "Valid/Expired" Logic ---
    today = date.today()
    
    status_str: str
    if vehicle.licence_expiry_date < today:
        status_str = "EXPIRED"
    else:
        status_str = "VALID"
        
    # Manually create the response model
    response_data = schemas.VehicleResponse(
        **vehicle.__dict__,  # Unpack all columns from the DB model
        status=status_str      # Add our calculated status
    )
    
    return response_data

# --- Public Endpoint: Search by License Number ---
@app.get("/vehicles/license/{license_number}", response_model=schemas.VehicleResponse)
async def get_vehicle_by_license(
    license_number: str,
    current_user: Annotated[models.User, Depends(get_current_user)], # Allow any authenticated user
    db: Session = Depends(get_db)
):
    # Clean input? Maybe just trim whitespace. License numbers might have dashes/spaces.
    # Let's assume exact match or simple trim for now.
    cleaned_license = license_number.strip()

    vehicle = db.query(Vehicle).filter(Vehicle.licence_number == cleaned_license).first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found with this license number"
        )

    # Calculate status
    today = date.today()
    status_str: str
    if vehicle.licence_expiry_date < today:
        status_str = "EXPIRED"
    else:
        status_str = "VALID"

    response_data = schemas.VehicleResponse(
        **vehicle.__dict__,
        status=status_str
    )
    return response_data

# --- DMT-Only Endpoint ---
@app.post("/vehicles", response_model=schemas.VehicleResponse)
async def create_vehicle_registration(
    vehicle: schemas.VehicleCreate,
    # This endpoint is for DMT only
    dmt_user: Annotated[models.User, Depends(security.get_dmt_user)],
    db: Session = Depends(get_db)
):
    db_vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == vehicle.vehicle_number).first()
    if db_vehicle:
        raise HTTPException(
            status_code=400, 
            detail="Vehicle number already registered"
        )
        
    new_vehicle = Vehicle(**vehicle.dict())
    
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    # We still need to calculate the status for the return
    today = date.today()
    status_str = "VALID"
    if new_vehicle.licence_expiry_date < today:
        status_str = "EXPIRED"

    response_data = schemas.VehicleResponse(
        **new_vehicle.__dict__,
        status=status_str
    )
    
    return response_data

# --- DMT-Only Endpoint: Renew License ---
@app.put("/vehicles/{plate_number}/renew", response_model=schemas.VehicleResponse)
async def renew_vehicle_license(
    plate_number: str,
    renewal_data: schemas.VehicleRenew,
    dmt_user: Annotated[models.User, Depends(security.get_dmt_user)],
    db: Session = Depends(get_db)
):
    cleaned_plate = re.sub(r'[^A-Za-z0-9]', '', plate_number).upper()
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == cleaned_plate).first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )

    # Update fields
    vehicle.licence_expiry_date = renewal_data.new_expiry_date
    if renewal_data.new_valid_from:
        vehicle.licence_valid_from = renewal_data.new_valid_from
    
    db.commit()
    db.refresh(vehicle)

    # Calculate status
    today = date.today()
    status_str = "VALID"
    if vehicle.licence_expiry_date < today:
        status_str = "EXPIRED"

    response_data = schemas.VehicleResponse(
        **vehicle.__dict__,
        status=status_str
    )
    return response_data

# --- Helper Dependency: Get DB User from Token ---
async def get_current_db_user(
    token_user: Annotated[models.User, Depends(get_current_user)], # It's actually TokenData but we verify against DB
    db: Session = Depends(get_db)
):
    # token_user.username is actually the email
    user = db.query(models.User).filter(models.User.email == token_user.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in registry")
    return user

# --- Saved Vehicles Endpoints ---

@app.post("/saved-vehicles/{plate_number}")
async def save_vehicle_for_user(
    plate_number: str,
    user: Annotated[models.User, Depends(get_current_db_user)],
    db: Session = Depends(get_db)
):
    # Clean plate
    cleaned_plate = re.sub(r'[^A-Za-z0-9]', '', plate_number).upper()
    
    # Check if vehicle exists
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == cleaned_plate).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Check if already saved
    existing = db.query(models.UserSavedVehicle).filter(
        models.UserSavedVehicle.user_id == user.id,
        models.UserSavedVehicle.vehicle_number == cleaned_plate
    ).first()
    
    if existing:
        return JSONResponse(status_code=409, content={"detail": "Vehicle already saved"})

    # Save
    saved = models.UserSavedVehicle(user_id=user.id, vehicle_number=cleaned_plate)
    db.add(saved)
    db.commit()
    return {"message": "Vehicle saved successfully"}

@app.delete("/saved-vehicles/{plate_number}")
async def remove_saved_vehicle(
    plate_number: str,
    user: Annotated[models.User, Depends(get_current_db_user)],
    db: Session = Depends(get_db)
):
    cleaned_plate = re.sub(r'[^A-Za-z0-9]', '', plate_number).upper()
    
    saved_vehicle = db.query(models.UserSavedVehicle).filter(
        models.UserSavedVehicle.user_id == user.id,
        models.UserSavedVehicle.vehicle_number == cleaned_plate
    ).first()

    if not saved_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found in your list")
    
    db.delete(saved_vehicle)
    db.commit()
    return {"message": "Vehicle removed successfully"}

@app.get("/saved-vehicles", response_model=list[schemas.UserSavedVehicleResponse])
async def get_user_saved_vehicles(
    user: Annotated[models.User, Depends(get_current_db_user)],
    db: Session = Depends(get_db)
):
    # Join UserSavedVehicle with Vehicle
    results = db.query(Vehicle).join(
        models.UserSavedVehicle, 
        models.UserSavedVehicle.vehicle_number == Vehicle.vehicle_number
    ).filter(
        models.UserSavedVehicle.user_id == user.id
    ).all()

    response_list = []
    today = date.today()

    for v in results:
        status_str = "VALID"
        if v.licence_expiry_date < today:
            status_str = "EXPIRED"

        response_list.append(
            schemas.UserSavedVehicleResponse(
                **v.__dict__,
                status=status_str
            )
        )

    return response_list
