"""
Unified database models for Thermal Eye
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Single unified Base for all models
Base = declarative_base()

class ThermalReport(Base):
    __tablename__ = "thermal_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    tower_id = Column(Integer, nullable=True)
    tower_name = Column(String, nullable=True)
    camp_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_temp = Column(Float, nullable=True)
    ambient_temp = Column(Float, nullable=True)
    delta_t = Column(Float, nullable=True)
    threshold_used = Column(Float, nullable=True)
    fault_level = Column(String, nullable=True)  # NORMAL, WARNING, CRITICAL
    priority = Column(String, nullable=True)  # CRITICAL, HIGH, MEDIUM
    voltage_kv = Column(Integer, nullable=True)
    capacity_amps = Column(Integer, nullable=True)
    commissioning_year = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String, nullable=True)
    analysis_status = Column(String, default="pending")  # success, failed, pending

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer")  # 'admin', 'viewer'
    created_at = Column(DateTime, default=datetime.utcnow)
