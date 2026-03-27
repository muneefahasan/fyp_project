from pydantic import BaseModel
from datetime import date
from typing import Optional

# Base model for a vehicle
class VehicleBase(BaseModel):
    vehicle_number: str
    licence_number: str
    vehicle_class: str
    fuel_type: str
    owner_name: str
    owner_address: str
    licence_valid_from: date
    licence_expiry_date: date
    district: str
    owner_nic: str

# Model for creating a new vehicle (for DMT)
class VehicleCreate(VehicleBase):
    pass

# Model for renewing a vehicle license
class VehicleRenew(BaseModel):
    new_expiry_date: date
    new_valid_from: Optional[date] = None

# This is the model the API will RETURN
# It includes the database fields + our calculated 'status'
class VehicleResponse(VehicleBase):
    status: str # 'VALID' or 'EXPIRED'

    class Config:
        from_attributes = True

# Response for saved vehicles list
class UserSavedVehicleResponse(VehicleResponse):
    pass
    
    class Config:
        from_attributes = True
