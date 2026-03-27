from sqlalchemy import Column, String, Date, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base

# This is the correct Vehicle model
class Vehicle(Base):
    __tablename__ = "vehicles"

    # --- Vehicle Details ---
    vehicle_number = Column(String(20), primary_key=True, index=True)
    vehicle_class = Column(String(100))
    fuel_type = Column(String(50))

    # --- Owner Details ---
    owner_name = Column(String(255))
    owner_address = Column(String(500))
    owner_nic = Column(String(12)) # Moved from User to Vehicle
    district = Column(String(100))  # Moved from User to Vehicle

    # --- Licence Details ---
    licence_number = Column(String(50), unique=True, nullable=False)
    licence_valid_from = Column(Date)
    licence_expiry_date = Column(Date, nullable=False) # Moved from User to Vehicle


# This is the correct User model
# This is the correct User model (Matches auth_service)
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    # is_active = Column(Boolean, default=True) # Not in data_setup.sql, removing to avoid confusion if not needed, or keeping if standard. unique=True implies it's ok. 


# New Table: Link Users to their Saved Vehicles
class UserSavedVehicle(Base):
    __tablename__ = "user_saved_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vehicle_number = Column(String(20), ForeignKey("vehicles.vehicle_number"), nullable=False)
    
    # Optional: Date added
    # date_added = Column(Date, default=date.today)

    # Relationship (optional, for convenience)
    # user = relationship("User", back_populates="saved_vehicles")
    # vehicle = relationship("Vehicle")
