#!/usr/bin/env python3
"""
Thermal Eye FastAPI Backend
Professional thermal inspection system with dynamic thresholds and PostgreSQL integration.
"""

import os
import uuid
import json
import asyncio
import tempfile
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple
from math import radians, cos, sin, asin, sqrt

# Configure structured logging
import structlog
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
try:
    from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
except ImportError:
    SqlAlchemyIntegration = None

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Configure Sentry for error tracking
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    integrations = [FastApiIntegration(auto_enabling_integrations=False)]
    if SqlAlchemyIntegration:
        integrations.append(SqlAlchemyIntegration())
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=integrations,
        traces_sample_rate=0.1,
        environment=os.environ.get('ENVIRONMENT', 'development')
    )

logger = structlog.get_logger()

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from PIL import ImageOps
# PDF report generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
try:
    # Pillow 10 removed Image.ANTIALIAS; ensure compatibility for libs that still reference it
    from PIL.Image import Resampling  # Pillow >=9
    if not hasattr(Image, 'ANTIALIAS'):
        Image.ANTIALIAS = Resampling.LANCZOS  # type: ignore[attr-defined]
except Exception:
    pass
import sqlalchemy
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Import configuration
from app.config import *
from app.models import Base, ThermalReport, User as AuthUser, AuditLog
from app.auth.routes import router as auth_router
from app.auth.dependencies import get_current_user
from app.middleware.rate_limit import RateLimitMiddleware, upload_rate_limit, general_rate_limit

# Initialize FastAPI app
app = FastAPI(
    title="Thermal Eye",
    description="Professional thermal inspection system for Tata Power Mumbai towers",
    version="1.0.0"
)

# Serve generated PDF reports statically
try:
    os.makedirs(REPORTS_DIR, exist_ok=True)
except Exception:
    pass
app.mount(f"/static/{REPORTS_DIR}", StaticFiles(directory=REPORTS_DIR), name="reports")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],  # React dev server and build
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware, calls=60, period=60)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging and trace ID"""
    import traceback
    import uuid
    
    trace_id = str(uuid.uuid4())
    
    logger.error(
        "Unhandled exception",
        trace_id=trace_id,
        error_type=type(exc).__name__,
        error_message=str(exc),
        path=request.url.path,
        method=request.method,
        user_agent=request.headers.get("user-agent"),
        client_host=request.client.host if request.client else None,
        traceback=traceback.format_exc(),
        exc_info=True
    )
    
    if SENTRY_DSN:
        sentry_sdk.capture_exception(exc)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "trace_id": trace_id}
    )

# Database setup - using unified models
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables from unified Base
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Load tower data and Excel integration (using existing components)
class ExcelDataIntegrator:
    """Simplified version of existing excel_data_integrator for FastAPI."""
    
    def __init__(self):
        self.tower_metadata = {}
        self.load_excel_data()
    
    def load_excel_data(self):
        """Load Excel metadata from provided files with flexible headers and robust numeric coercion."""
        paths_to_try = [
            'data/Updated_Common_Data.xlsx',
            'data/110kV_Line_Schedule.xlsx',
            'data/220kV_Line_Schedule.xlsx',
            '/Users/pranavsingh/Desktop/Current Work/kml to csv/Updated Overhead Lines Common Data - 28.12.2023 R6.xlsx',
            '/Users/pranavsingh/Desktop/Current Work/kml to csv/110 kV OH Line Schedule - 07.05.2021 (1).xlsx',
            '/Users/pranavsingh/Desktop/Current Work/kml to csv/220 kV OH Line Schedule - 07.05.2021 (2).xlsx',
        ]
        loaded = 0
        for path in paths_to_try:
            try:
                if not os.path.exists(path):
                    continue
                # Read all sheets to be robust
                sheets = pd.read_excel(path, sheet_name=None)
                for sheet_name, df in sheets.items():
                    if df is None or df.empty:
                        continue
                    # Normalize columns
                    df_columns = {str(c).strip(): c for c in df.columns}
                    # Heuristic column picks
                    line_col = next((c for k, c in df_columns.items() if 'line name' in k.lower() or 'line' in k.lower()), None)
                    volt_col = next((c for k, c in df_columns.items() if 'volt' in k.lower()), None)
                    cap_col = next((c for k, c in df_columns.items() if 'amp' in k.lower() or 'capacity' in k.lower()), None)
                    comm_col = next((c for k, c in df_columns.items() if 'commission' in k.lower() or 'year' in k.lower()), None)
                    if not line_col or not volt_col:
                        continue
                    for _, row in df.iterrows():
                        line_name = str(row.get(line_col, '')).strip()
                        if not line_name:
                            continue
                        # Skip subtotal/total rows
                        if any(str(row.get(c, '')).strip().lower().startswith('total') for c in [line_col, volt_col, cap_col or '', comm_col or '']):
                            continue
                        voltage_raw = row.get(volt_col, '')
                        voltage_str = str(voltage_raw).strip()
                        # Extract numeric kV
                        import re
                        vm = re.search(r'(\d+)\s*kV', voltage_str)
                        if vm:
                            voltage = int(vm.group(1))
                        else:
                            voltage = pd.to_numeric(voltage_raw, errors='coerce')
                            voltage = int(voltage) if pd.notna(voltage) else None
                        if voltage is None:
                            continue  # cannot determine voltage; skip row
                        # Capacity and commissioning year coercion
                        capacity_raw = row.get(cap_col, 1000) if cap_col in df.columns else 1000
                        commissioning_raw = row.get(comm_col, 2000) if comm_col in df.columns else 2000
                        capacity_val = pd.to_numeric(capacity_raw, errors='coerce')
                        if isinstance(capacity_val, str):
                            # pull first number sequence
                            cm = re.search(r'(\d+)', capacity_val)
                            capacity_val = int(cm.group(1)) if cm else 1000
                        else:
                            capacity_val = int(capacity_val) if pd.notna(capacity_val) else 1000
                        year_val = pd.to_numeric(commissioning_raw, errors='coerce')
                        year_val = int(year_val) if pd.notna(year_val) else 2000
                        self.tower_metadata[line_name] = {
                            'voltage_kv': voltage,
                            'capacity_amps': capacity_val,
                            'commissioning_year': year_val
                        }
                        loaded += 1
            except Exception as e:
                print(f"⚠️ Warning: Could not parse Excel path {path}: {e}")
        print(f"✅ Loaded metadata for {loaded} line records from Excel")
    
    def get_tower_metadata(self, tower_name: str, camp_name: Optional[str] = None) -> Dict[str, Any]:
        """Get metadata for a tower by matching with camp/line info or line name heuristics."""
        # Default metadata
        default = {
            'voltage_kv': 110,
            'capacity_amps': 1000,
            'commissioning_year': 2000,
            'priority': 'MEDIUM',
            'camp_name': camp_name or 'Unknown Camp'
        }
        
        # 1) Match by camp name token
        if camp_name:
            camp_lower = camp_name.lower()
            
            # Enhanced matching for known camp patterns
            camp_mappings = {
                'kks': ['kalwa', 'kalyan', 'salsette'],
                'borivali': ['borivli', 'borivali'],
                'trombay': ['trombay'],
                'salsette': ['salsette'],
                'kalyan': ['kalyan'],
                'panvel': ['panvel'],
                'khopoli': ['khopoli', 'bhira']
            }
            
            # Try direct camp name matching first
            for line_name, metadata in self.tower_metadata.items():
                if camp_lower in line_name.lower():
                    return {
                        **default,
                        **metadata,
                        'priority': self._calculate_priority(metadata['voltage_kv'], metadata['capacity_amps']),
                        'camp_name': camp_name
                    }
            
            # Try pattern matching (e.g., "kks" -> kalwa/kalyan/salsette)
            for pattern, keywords in camp_mappings.items():
                if pattern in camp_lower:
                    for line_name, metadata in self.tower_metadata.items():
                        if any(keyword in line_name.lower() for keyword in keywords):
                            return {
                                **default,
                                **metadata,
                                'priority': self._calculate_priority(metadata['voltage_kv'], metadata['capacity_amps']),
                                'camp_name': camp_name
                            }
        # 2) Match by tower name tokens (e.g., "Loc. 85" might appear in line naming or adjacent cells)
        if tower_name:
            base = tower_name.lower().replace('loc.', '').strip()
            for line_name, metadata in self.tower_metadata.items():
                if base and base in line_name.lower():
                    return {
                        **default,
                        **metadata,
                        'priority': self._calculate_priority(metadata['voltage_kv'], metadata['capacity_amps']),
                        'camp_name': camp_name or default['camp_name']
                    }
        
        return default
    
    def _calculate_priority(self, voltage_kv: int, capacity_amps: int) -> str:
        """Calculate priority level."""
        if voltage_kv >= 220:
            return "CRITICAL"
        elif capacity_amps > 1000:
            return "HIGH"
        else:
            return "MEDIUM"
    
    def get_dynamic_threshold(self, tower_name: str, camp_name: Optional[str] = None) -> float:
        """Calculate dynamic temperature threshold for a tower."""
        metadata = self.get_tower_metadata(tower_name, camp_name)
        
        if not metadata:
            return 5.0  # Default threshold
        
        voltage_kv = metadata.get('voltage_kv', 110)
        capacity_amps = metadata.get('capacity_amps', 1000)
        commissioning_year = metadata.get('commissioning_year', 2000)
        
        # Base threshold
        base_threshold = 8.0 if voltage_kv >= 220 else 5.0
        
        # Age adjustment (older equipment = lower threshold)
        age = 2024 - commissioning_year
        age_adjustment = min(age * 0.1, 2.0)  # Max 2°C reduction
        
        # Capacity adjustment (higher capacity = lower threshold)
        capacity_adjustment = capacity_amps / 1000.0  # 1°C per 1000A
        
        final_threshold = base_threshold - age_adjustment - capacity_adjustment
        
        # Ensure minimum threshold of 2°C
        return max(final_threshold, 2.0)

# Initialize Excel integrator
excel_integrator = ExcelDataIntegrator()

# Load towers data
try:
    towers_df = pd.read_csv(TOWERS_CSV_PATH)
    print(f"✅ Loaded {len(towers_df)} towers from database")
except Exception as e:
    print(f"⚠️ Warning: Could not load towers CSV: {e}")
    towers_df = pd.DataFrame()

ocr_reader = None

def get_ocr_reader():
    """Lazily initialize and return a global EasyOCR reader."""
    global ocr_reader
    if ocr_reader is not None:
        return ocr_reader
    try:
        import easyocr
        ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        print("✅ EasyOCR initialized successfully")
        return ocr_reader
    except Exception as e:
        print(f"⚠️ Warning: EasyOCR initialization failed: {e}")
        ocr_reader = None
        return None

# Pydantic models for API responses
class UploadResponse(BaseModel):
    id: int
    tower_id: Optional[int]
    tower_name: Optional[str]
    camp_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    image_temp: Optional[float]
    ambient_temp: Optional[float]
    delta_t: Optional[float]
    threshold_used: Optional[float]
    fault_level: Optional[str]
    priority: Optional[str]
    voltage_kv: Optional[int]
    capacity_amps: Optional[int]
    distance_km: Optional[float]
    timestamp: datetime
    analysis_status: str

class ReportSummary(BaseModel):
    id: int
    tower_name: Optional[str]
    camp_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    fault_level: Optional[str]
    priority: Optional[str]
    image_temp: Optional[float]
    delta_t: Optional[float]
    threshold_used: Optional[float]
    voltage_kv: Optional[int]
    timestamp: datetime

class DetailedReport(BaseModel):
    report_data: UploadResponse
    ai_summary: str
    pdf_path: Optional[str] = None

class BatchUploadResponse(BaseModel):
    results: List[UploadResponse]
    total: int
    critical: int
    warning: int
    normal: int
    failed: int
    pdf_path: Optional[str] = None

# Utility functions (extracted from thermal_pipeline.py)
def extract_gps_from_image(image_path: str) -> tuple:
    """Extract GPS coordinates from image EXIF data."""
    try:
        with Image.open(image_path) as img:
            exif_data = img.getexif()
            
            if exif_data:
                gps_data = {}
                for tag, value in exif_data.items():
                    tag_name = TAGS.get(tag, tag)
                    if tag_name == 'GPSInfo':
                        for gps_tag, gps_value in value.items():
                            gps_tag_name = GPSTAGS.get(gps_tag, gps_tag)
                            gps_data[gps_tag_name] = gps_value
                        break
                
                if all(tag in gps_data for tag in ['GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef']):
                    def dms_to_decimal(dms, ref):
                        degrees = float(dms[0])
                        minutes = float(dms[1])
                        seconds = float(dms[2])
                        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
                        if ref in ['S', 'W']:
                            decimal = -decimal
                        return round(decimal, 6)
                    
                    lat = dms_to_decimal(gps_data['GPSLatitude'], gps_data['GPSLatitudeRef'])
                    lon = dms_to_decimal(gps_data['GPSLongitude'], gps_data['GPSLongitudeRef'])
                    return lat, lon
    except Exception as e:
        print(f"Error extracting GPS: {e}")
    
    return None, None

def extract_temperature_from_image(image_path: str) -> Optional[float]:
    """Extract temperature with enhanced preprocessing and heuristics to prefer the 'Max' reading near its label and degree mark."""
    reader = get_ocr_reader()
    if reader is None:
        import random
        return round(random.uniform(35, 55), 1)

    try:
        # Read image and crop to top band where overlays live
        pil = Image.open(image_path).convert('RGB')
        width, height = pil.size
        # Select ROI based on config (default top-left)
        roi_h = int(height * OCR_TOP_FRACTION)
        roi_h = max(1, min(height, roi_h))
        if OCR_REGION == 'top_right':
            roi_w = int(width * OCR_SIDE_FRACTION)
            x0, y0, x1, y1 = width - roi_w, 0, width, roi_h
        elif OCR_REGION == 'full':
            x0, y0, x1, y1 = 0, 0, width, roi_h
        else:  # top_left
            roi_w = int(width * OCR_SIDE_FRACTION)
            x0, y0, x1, y1 = 0, 0, roi_w, roi_h
        
        # Crop the ROI
        band_pil = pil.crop((x0, y0, x1, y1))
        
        # Try enhanced preprocessing if enabled, fallback to simple if it fails
        if OCR_USE_ENHANCED_PREPROCESSING:
            try:
                # Enhanced preprocessing for better OCR accuracy
                from PIL import ImageOps, ImageEnhance
                
                # 1. Convert to grayscale for better text contrast
                band_gray = band_pil.convert('L')
                
                # 2. Light contrast enhancement
                band_gray = ImageOps.equalize(band_gray)
                
                # 3. Light sharpness enhancement (configurable)
                enhancer = ImageEnhance.Sharpness(band_gray)
                band_gray = enhancer.enhance(OCR_SHARPNESS_FACTOR)
                
                # 4. Moderate scaling for better OCR (configurable scaling)
                new_width = int(band_gray.width * OCR_SCALE_FACTOR)
                new_height = int(band_gray.height * OCR_SCALE_FACTOR)
                band_gray = band_gray.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Convert back to numpy array
                band = np.array(band_gray)
                
                # 5. Apply morphological operations to clean up noise (optional)
                if OCR_USE_MORPHOLOGY:
                    import cv2
                    kernel = np.ones((2, 2), np.uint8)
                    band = cv2.morphologyEx(band, cv2.MORPH_CLOSE, kernel)
                    band = cv2.morphologyEx(band, cv2.MORPH_OPEN, kernel)
                
                # 6. Apply adaptive thresholding to improve text clarity (optional)
                if OCR_USE_ADAPTIVE_THRESHOLD:
                    import cv2
                    band = cv2.adaptiveThreshold(band, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

                # OCR on the enhanced band
                ocr_results = reader.readtext(band)
                
                # If enhanced preprocessing returns no results, fallback to simple
                if not ocr_results:
                    raise ValueError("Enhanced preprocessing returned no OCR results")
                    
            except Exception as e:
                print(f"Enhanced OCR preprocessing failed, falling back to simple: {e}")
                # Fallback to simple processing
                band = np.array(band_pil)
                ocr_results = reader.readtext(band)
        else:
            # Simple processing (original working method)
            band = np.array(band_pil)
            ocr_results = reader.readtext(band)

        import re
        # Enhanced temperature pattern matching
        # Look for 1-3 digits followed by optional decimal (more flexible)
        temp_num = re.compile(r"(\d{1,3}(?:\.\d{1,2})?)")
        # Also look for patterns like "39.2°C" or "39.2 C" or "Max: 39.2"
        temp_with_unit = re.compile(r"(\d{1,3}(?:\.\d{1,2})?)\s*[°]?\s*[CcFf]?")
        temp_max_pattern = re.compile(r"max\s*:?\s*(\d{1,3}(?:\.\d{1,2})?)", re.IGNORECASE)

        def bbox_center(b):
            # b is list of 4 points [[x1,y1],...]
            xs = [p[0] for p in b]
            ys = [p[1] for p in b]
            return (sum(xs) / 4.0, sum(ys) / 4.0)

        # Collect candidates
        numbers = []  # (value, conf, bbox, text)
        labels_max = []  # (bbox, conf, text)
        degree_candidates = []  # numbers whose text also has ° or C

        for (bbox, text, conf) in ocr_results:
            if conf < OCR_CONFIDENCE_THRESHOLD or not text:
                continue
            text_clean = text.strip()
            # Enhanced label detection
            if 'max' in text_clean.lower():
                labels_max.append((bbox, conf, text_clean))
                # Check if this text itself contains "Max: XX.X" pattern
                max_matches = temp_max_pattern.findall(text_clean)
                for m in max_matches:
                    try:
                        val = float(m)
                        if OCR_TEMPERATURE_RANGE[0] <= val <= OCR_TEMPERATURE_RANGE[1]:
                            entry = (val, conf + 0.2, bbox, text_clean)  # Boost confidence for Max pattern
                            numbers.append(entry)
                            degree_candidates.append(entry)
                    except ValueError:
                        continue
            
            # Find numeric tokens with enhanced patterns
            # 1. Try temperature with unit pattern first (highest priority)
            unit_matches = temp_with_unit.findall(text_clean)
            for m in unit_matches:
                try:
                    val = float(m)
                    if OCR_TEMPERATURE_RANGE[0] <= val <= OCR_TEMPERATURE_RANGE[1]:
                        entry = (val, conf + 0.1, bbox, text_clean)  # Boost confidence for unit pattern
                        numbers.append(entry)
                        degree_candidates.append(entry)
                except ValueError:
                    continue
            
            # 2. Fallback to general numeric pattern
            for m in temp_num.findall(text_clean):
                try:
                    val = float(m)
                except ValueError:
                    continue
                if OCR_TEMPERATURE_RANGE[0] <= val <= OCR_TEMPERATURE_RANGE[1]:
                    # Check if this number was already found with unit pattern
                    if not any(abs(existing[0] - val) < 0.1 for existing in numbers):
                        entry = (val, conf, bbox, text_clean)
                        numbers.append(entry)
                        if ('°' in text_clean) or ('c' in text_clean.lower()) or ('f' in text_clean.lower()):
                            degree_candidates.append(entry)

        # 1) Prefer number on the same line as a 'Max' label (to the right and close vertically)
        def pick_near_label():
            best = None
            for (lbbox, lconf, _lt) in labels_max:
                lx, ly = bbox_center(lbbox)
                l_ymin = min(p[1] for p in lbbox)
                l_ymax = max(p[1] for p in lbbox)
                for (val, conf, nbbox, _nt) in numbers:
                    nx, ny = bbox_center(nbbox)
                    # horizontally to the right of label and roughly same row
                    band_h = (y1 - y0) if (y1 - y0) > 0 else 1
                    same_row = (l_ymin - band_h*0.05) <= ny <= (l_ymax + band_h*0.05)
                    to_right = nx > lx
                    if same_row and to_right:
                        dist = abs(ny - ly) + max(0, nx - lx)
                        score = (conf * 2.0) - (dist / max(1.0, band_h))
                        if (best is None) or (score > best[0]):
                            best = (score, val)
            return best[1] if best else None

        # 2) Else prefer numbers whose text had degree/C mark
        def pick_degree_mark():
            if not degree_candidates:
                return None
            # Highest confidence
            return sorted(degree_candidates, key=lambda x: x[1], reverse=True)[0][0]

        # 3) Else numbers in top-right quadrant of the band
        def pick_top_right():
            if not numbers:
                return None
            candidates = []
            for (val, conf, nbbox, _nt) in numbers:
                nx, ny = bbox_center(nbbox)
                if nx >= width * 0.6:  # right side of the band
                    candidates.append((conf, val))
            if candidates:
                return sorted(candidates, reverse=True)[0][1]
            return None

        # 4) Fallback: highest-confidence numeric
        def pick_highest_conf():
            if not numbers:
                return None
            return sorted(numbers, key=lambda x: x[1], reverse=True)[0][0]

        # If region is top_left, prefer top-left positions; if top_right, prefer right-side; otherwise rely on label/degree/conf
        pick_order = [pick_near_label, pick_degree_mark]
        if OCR_REGION == 'top_right':
            pick_order.append(pick_top_right)
        pick_order.append(pick_highest_conf)

        for picker in pick_order:
            chosen = picker()
            if chosen is not None:
                return chosen
    except Exception as e:
        print(f"Error extracting temperature: {e}")
    return None

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate haversine distance between two points in kilometers."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return c * 6371  # Earth radius in km

def find_nearest_tower(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Find the nearest tower to given coordinates."""
    if towers_df.empty:
        return None
    
    min_distance = float('inf')
    nearest_tower = None
    
    for _, tower in towers_df.iterrows():
        try:
            tower_lat = float(tower['latitude'])
            tower_lon = float(tower['longitude'])
            distance = haversine_distance(lat, lon, tower_lat, tower_lon)
            
            if distance < min_distance:
                min_distance = distance
                camp_name = tower.get('camp_name', 'Unknown Camp')
                
                # Get enhanced metadata
                metadata = excel_integrator.get_tower_metadata(tower['tower_name'], camp_name)
                
                nearest_tower = {
                    'tower_id': int(tower['tower_id']),
                    'tower_name': tower['tower_name'],
                    'camp_name': camp_name,
                    'latitude': tower_lat,
                    'longitude': tower_lon,
                    'distance_km': round(distance, 3),
                    **metadata
                }
        except (ValueError, KeyError) as e:
            continue
    
    return nearest_tower

def get_weather_temperature() -> float:
    """Get current weather temperature for Mumbai."""
    if not WEATHER_API_KEY:
        return 28.5  # Fallback
    
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={MUMBAI_LAT}&lon={MUMBAI_LON}&appid={WEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return round(data['main']['temp'], 1)
    except Exception as e:
        print(f"Weather API failed: {e}")
        return 28.5

def classify_fault_level(delta_t: float, threshold: float, priority: str) -> str:
    """Classify fault level based on temperature difference and priority."""
    if delta_t <= threshold:
        return "NORMAL"
    elif priority == "CRITICAL" or delta_t > threshold * 2:
        return "CRITICAL"
    else:
        return "WARNING"

def clean_ai_content(ai_content: str, is_email: bool = False) -> str:
    """Clean up AI-generated content for better formatting and readability."""
    import re
    
    # Ensure we have a string
    if isinstance(ai_content, bytes):
        ai_content = ai_content.decode('utf-8')
    
    ai_content = str(ai_content.strip())
    
    # Remove all markdown formatting
    ai_content = ai_content.replace('**', '')  # Remove bold markdown
    ai_content = ai_content.replace('###', '')  # Remove header markdown
    ai_content = ai_content.replace('##', '')   # Remove header markdown
    ai_content = ai_content.replace('#', '')    # Remove header markdown
    ai_content = ai_content.replace('*', '')    # Remove italic markdown
    ai_content = ai_content.replace('_', '')    # Remove underscore markdown
    
    if is_email:
        # For emails, ensure proper paragraph separation
        ai_content = re.sub(r'\n{1,2}', '\n\n', ai_content)  # Ensure double line breaks
        ai_content = re.sub(r'\n{3,}', '\n\n', ai_content)   # Remove excessive breaks
    else:
        # For detailed reports, ensure proper section spacing
        ai_content = re.sub(r'\n(\d+\.)', r'\n\n\1', ai_content)  # Double space before sections
        ai_content = re.sub(r'\n{3,}', '\n\n', ai_content)       # Clean up multiple breaks
    
    # Clean up any remaining formatting issues
    ai_content = ai_content.strip()
    
    return ai_content

async def generate_email_ai_summary(report_data: Dict[str, Any]) -> str:
    """Generate AI-powered email summary using OpenRouter API."""
    
    if not OPENROUTER_API_KEY:
        return "CRITICAL THERMAL ANOMALY DETECTED - Professional assessment indicates immediate attention required for this equipment. Please refer to detailed technical analysis in the attached report."
    
    try:
        # Create professional email prompt
        def fmt(v, unit=""): return f"{v}{unit}" if v is not None else "N/A"
        
        # Calculate equipment age for better context
        equipment_age = "N/A"
        commissioning_year = report_data.get('commissioning_year')
        if commissioning_year:
            try:
                year = int(commissioning_year)
                equipment_age = f"{datetime.now().year - year} years"
            except (ValueError, TypeError):
                equipment_age = "N/A"
        
        prompt = f"""
        You are a senior electrical engineer drafting an urgent safety alert for power grid operations team. Write a professional, structured emergency notification about a critical thermal condition.

        CRITICAL THERMAL ALERT DETAILS:
        - Equipment: {report_data.get('tower_name', 'Unknown')} at {report_data.get('camp_name', 'Unknown')} substation
        - System: {report_data.get('voltage_kv', 'Unknown')}kV transmission line, {report_data.get('capacity_amps', 'Unknown')}A capacity
        - Equipment Age: {equipment_age} (commissioned {report_data.get('commissioning_year', 'N/A')})
        - Thermal Reading: {fmt(report_data.get('image_temp'), '°C')} measured (ambient: {fmt(report_data.get('ambient_temp'), '°C')})
        - Temperature Excess: +{fmt(report_data.get('delta_t'), '°C')} above dynamic threshold ({fmt(report_data.get('threshold_used'), '°C')})
        - Risk Classification: {report_data.get('priority', 'CRITICAL')} priority

        Write exactly 3 paragraphs:

        PARAGRAPH 1 - IMMEDIATE RISK ALERT: State the critical thermal condition, specific temperature readings, and immediate safety risk.

        PARAGRAPH 2 - TECHNICAL CONTEXT: Reference applicable IEEE/IEC standards, explain why this condition is critical for this equipment type and age.

        PARAGRAPH 3 - REQUIRED ACTIONS: Specify immediate actions needed within 2-4 hours including load reduction, inspection, and contingency measures.

        FORMATTING REQUIREMENTS:
        - Write exactly 3 distinct paragraphs separated by blank lines
        - Each paragraph should be 2-3 sentences maximum
        - Use professional but urgent tone
        - No bullet points, no markdown formatting (**, ###, etc.)
        - End each paragraph with a period
        
        Use authoritative engineering language appropriate for operations managers and field engineers.
        """
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/thermal-eye/emergency-alerts",
            "X-Title": "Critical Thermal Alert Email Generation"
        }
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": "You are a senior electrical engineer with expertise in power transmission systems and emergency response protocols. Write clear, authoritative communications for engineering teams."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 250,  # Increased for more detailed alerts
            "temperature": 0.2,  # Lower for more precise, factual content
            "top_p": 0.8
        }
        
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        ai_content = result['choices'][0]['message']['content']
        
        # Clean up formatting for email content
        ai_content = clean_ai_content(ai_content, is_email=True)
        
        if ai_content:
            return ai_content
        else:
            return "CRITICAL THERMAL ANOMALY DETECTED - Professional assessment indicates immediate attention required for this equipment."
            
    except Exception as e:
        print(f"⚠️ Email AI generation failed: {e}")
        return "CRITICAL THERMAL ANOMALY DETECTED - Professional assessment indicates immediate attention required for this equipment. Please refer to detailed technical analysis."

async def send_critical_alert_email(report_data: Dict[str, Any]):
    """Send email alert for critical faults with AI-generated professional summary."""
    if not SMTP_PASSWORD or not SMTP_USER:
        print("⚠️ Email configuration missing, skipping alert")
        return
    
    try:
        from app.email_templates import generate_critical_alert_email
        
        # Generate AI-powered email content
        ai_summary = await generate_email_ai_summary(report_data)
        
        # Generate professional email using templates
        subject, html_body, text_body = generate_critical_alert_email(report_data, ai_summary)
        
        # Create multipart message
        msg = MIMEMultipart('alternative')
        msg['From'] = SMTP_USER
        msg['To'] = ', '.join(ALERT_RECIPIENTS)
        msg['Subject'] = subject
        
        # Attach both HTML and plaintext versions
        text_part = MIMEText(text_body, 'plain', 'utf-8')
        html_part = MIMEText(html_body, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email with proper error handling
        try:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            for recipient in ALERT_RECIPIENTS:
                server.sendmail(SMTP_USER, recipient, msg.as_string())
            server.quit()
            
            print(f"✅ Critical alert email sent for {report_data.get('tower_name', 'Unknown Tower')}")
            
        except smtplib.SMTPException as smtp_error:
            print(f"❌ SMTP error sending critical alert: {smtp_error}")
            # Write email to file as backup
            try:
                os.makedirs('/tmp/outbox', exist_ok=True)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_path = f"/tmp/outbox/critical_alert_{timestamp}.eml"
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(msg.as_string())
                print(f"📧 Email saved to backup: {backup_path}")
            except Exception as backup_error:
                print(f"⚠️ Failed to save email backup: {backup_error}")
                
    except Exception as e:
        print(f"❌ Failed to generate/send critical alert email: {e}")

def generate_ai_summary_sync(record: ThermalReport) -> str:
    """Generate AI-powered summary using OpenRouter API (sync version for PDF)."""
    
    if not OPENROUTER_API_KEY:
        return generate_fallback_summary(record)
    
    # Create structured prompt with safe values to avoid 'None°C'
    def fmt(v, unit=""):
        return f"{v}{unit}" if v is not None else "N/A"

    # Enhanced prompt for more detailed technical analysis (sync version)
    equipment_age = "Unknown"
    if record.commissioning_year:
        try:
            year = int(record.commissioning_year)
            equipment_age = datetime.now().year - year
        except (ValueError, TypeError):
            equipment_age = "Unknown"
    
    prompt = f"""
    You are a senior electrical engineer conducting a detailed thermal analysis of critical power infrastructure. Analyze this thermal inspection data and provide a comprehensive technical assessment:

    EQUIPMENT SPECIFICATIONS:
    - Tower/Substation: {record.tower_name or 'Unknown'} at {record.camp_name or 'Unknown Camp'}
    - Voltage Level: {fmt(record.voltage_kv, 'kV')} transmission line
    - Current Capacity: {fmt(record.capacity_amps, 'A')} rated capacity
    - Equipment Age: {equipment_age} years (commissioned {record.commissioning_year or 'N/A'})
    - Priority Classification: {record.priority or 'N/A'}

    THERMAL ANALYSIS DATA:
    - Measured Temperature: {fmt(record.image_temp, '°C')}
    - Ambient Temperature: {fmt(record.ambient_temp, '°C')}
    - Temperature Rise: +{fmt(record.delta_t, '°C')} above ambient
    - Dynamic Threshold: {fmt(record.threshold_used, '°C')} (based on equipment specifications)
    - Fault Classification: {record.fault_level or 'N/A'}

    Provide a well-structured technical assessment covering:

    1. THERMAL CONDITION ANALYSIS: Evaluate the thermal signature against IEEE standards and manufacturer specifications. Consider thermal loading patterns, heat dissipation mechanisms, and thermal cycling effects.

    2. ROOT CAUSE ASSESSMENT: Analyze potential causes including conductor degradation, connection loosening, insulator contamination, or overloading conditions. Consider environmental factors and aging effects.

    3. RISK EVALUATION: Assess immediate and long-term risks including equipment failure probability, safety hazards, system stability impacts, and potential cascading failures.

    4. TECHNICAL RECOMMENDATIONS: Provide specific engineering recommendations including inspection priorities, maintenance schedules, load management strategies, and monitoring protocols.

    5. COMPLIANCE & STANDARDS: Reference relevant standards (IEEE 738, IEC 60826) and maintenance practices.

    CRITICAL FORMATTING REQUIREMENTS:
    - Use numbered sections (1., 2., 3., etc.) with clear section headers
    - Write in paragraph form with proper line breaks between sections
    - Each section should be 2-3 sentences maximum
    - Use technical terminology appropriate for electrical engineers
    - Include specific action timelines where relevant
    - Do NOT use markdown formatting like ** or ###
    - Ensure proper spacing and readability
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/thermal-eye/api",
            "X-Title": "Thermal Inspection AI Analysis"
        }
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": "You are a senior electrical engineer with 20+ years of experience in power transmission systems, thermal analysis, and predictive maintenance. Provide detailed, technical assessments using industry-standard terminology."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 600,  # Increased for detailed analysis
            "temperature": 0.3,  # Lower for more focused, technical content
            "top_p": 0.9
        }
        
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        ai_content = result['choices'][0]['message']['content']
        
        # Ensure we always return a string, not bytes
        if isinstance(ai_content, bytes):
            ai_content = ai_content.decode('utf-8')
        
        # Clean up any markdown formatting for better readability
        ai_content = str(ai_content.strip())
        ai_content = ai_content.replace('**', '')  # Remove bold markdown
        ai_content = ai_content.replace('###', '')  # Remove header markdown
        ai_content = ai_content.replace('##', '')   # Remove header markdown
        ai_content = ai_content.replace('#', '')    # Remove header markdown
        
        return ai_content
        
    except Exception as e:
        print(f"⚠️ Sync AI generation failed: {e}")
        return generate_fallback_summary(record)

def create_temperature_chart_for_record(record: ThermalReport) -> Optional[str]:
    """Create a temperature comparison chart for the record."""
    try:
        if not record.image_temp or not record.ambient_temp:
            return None
            
        chart_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False).name
        
        plt.figure(figsize=(8, 5))
        
        # Data for the chart
        categories = ['Thermal Reading', 'Ambient Temperature', 'Dynamic Threshold']
        temperatures = [
            record.image_temp,
            record.ambient_temp,
            record.threshold_used or 5.0
        ]
        colors = ['#FF6B35', '#4ECDC4', '#95E1D3']
        
        bars = plt.bar(categories, temperatures, color=colors, alpha=0.8, edgecolor='black', linewidth=1)
        
        # Add value labels on bars
        for bar, temp in zip(bars, temperatures):
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 0.5, f'{temp:.1f}°C',
                    ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        # Add threshold line
        threshold = record.threshold_used or 5.0
        excess_line = record.ambient_temp + threshold
        plt.axhline(y=excess_line, color='red', linestyle='--', alpha=0.7, linewidth=2, 
                   label=f'Alert Threshold ({excess_line:.1f}°C)')
        
        plt.xlabel('Measurement Type', fontweight='bold')
        plt.ylabel('Temperature (°C)', fontweight='bold')
        plt.title(f'Temperature Analysis - {record.tower_name or "Unknown Tower"}', 
                 fontsize=14, fontweight='bold', pad=20)
        
        # Add grid and legend
        plt.grid(True, alpha=0.3, axis='y')
        plt.legend(loc='upper right')
        
        # Customize y-axis
        plt.ylim(0, max(temperatures) * 1.2)
        
        plt.tight_layout()
        plt.savefig(chart_file, dpi=300, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return chart_file
        
    except Exception as e:
        print(f"⚠️ Error creating temperature chart: {e}")
        return None

def generate_pdf_report_for_record(record: ThermalReport, nearest_tower: Optional[Dict[str, Any]]) -> str:
    """Generate comprehensive PDF report with AI analysis and professional formatting."""
    try:
        os.makedirs(REPORTS_DIR, exist_ok=True)
    except Exception:
        pass
    pdf_path = os.path.join(REPORTS_DIR, f"thermal_report_{record.id}.pdf")

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
    )
    story = []
    styles = getSampleStyleSheet()
    # Track temporary image files to clean up after PDF is built
    temp_images: List[str] = []

    # Custom styles for professional formatting
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.darkblue,
        spaceAfter=20,
        alignment=1,  # Center
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.grey,
        spaceAfter=30,
        alignment=1,  # Center
        fontName='Helvetica-Oblique'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.darkblue,
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )

    # Title section with enhanced styling
    title = Paragraph("🌡️ Thermal Inspection Analysis Report", title_style)
    story.append(title)
    
    subtitle = Paragraph(
        f"Enhanced Analysis with Dynamic Thresholds & AI Assessment<br/>Generated: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}",
        subtitle_style
    )
    story.append(subtitle)
    story.append(Spacer(1, 20))

    # Executive Summary with enhanced statistics
    summary_heading = Paragraph("📊 Executive Summary", heading_style)
    story.append(summary_heading)
    
    # Determine alert status for summary
    fault_level = record.fault_level or 'NORMAL'
    priority = record.priority or 'MEDIUM'
    status_icon = "🚨" if fault_level == 'CRITICAL' else "⚠️" if fault_level == 'WARNING' else "✅"
    
    summary_data = [
        ['Metric', 'Value', 'Assessment'],
        ['Alert Status', f'{status_icon} {fault_level}', 'Equipment condition classification'],
        ['Priority Level', f'{"🔴" if priority == "CRITICAL" else "🟡" if priority == "HIGH" else "🟢"} {priority}', 'Response urgency level'],
        ['Temperature Reading', f"{record.image_temp:.1f}°C" if record.image_temp is not None else 'N/A', 'Thermal camera measurement'],
        ['Dynamic Threshold', f"{record.threshold_used:.1f}°C" if record.threshold_used is not None else 'N/A', 'Equipment-specific alert level'],
        ['Temperature Excess', f"{record.delta_t:+.1f}°C" if record.delta_t is not None else 'N/A', 'Above ambient conditions'],
        ['Ambient Temperature', f"{record.ambient_temp:.1f}°C" if record.ambient_temp is not None else 'N/A', 'Weather API reference']
    ]
    
    summary_table = Table(summary_data, colWidths=[2.0*inch, 1.5*inch, 2.0*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.darkblue),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 25))

    # Equipment Details Section
    if nearest_tower or any([record.tower_name, record.camp_name, record.voltage_kv, record.capacity_amps]):
        equipment_heading = Paragraph("🏗️ Equipment Details", heading_style)
        story.append(equipment_heading)
        
        tower = nearest_tower or {}
        equipment_data = [
            ['Parameter', 'Value', 'Specification'],
            ['Tower Designation', tower.get('tower_name', record.tower_name) or 'N/A', 'Asset identification'],
            ['Location/Camp', tower.get('camp_name', record.camp_name) or 'N/A', 'Operational area'],
            ['Current Capacity', f"{(tower.get('capacity_amps') or record.capacity_amps)}A" if (tower.get('capacity_amps') or record.capacity_amps) else 'N/A', 'Maximum load rating'],
            ['Commissioning Year', str(record.commissioning_year) if record.commissioning_year else 'N/A', 'Installation date'],
            ['Distance from Image', f"{(tower.get('distance_km') or record.distance_km):.3f} km" if (tower.get('distance_km') or record.distance_km) is not None else 'N/A', 'GPS proximity'],
            ['Coordinates', f"{record.latitude:.6f}, {record.longitude:.6f}" if record.latitude and record.longitude else 'N/A', 'GPS location']
        ]
        
        equipment_table = Table(equipment_data, colWidths=[2.0*inch, 1.5*inch, 2.0*inch])
        equipment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.darkgreen),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        
        story.append(equipment_table)
        story.append(Spacer(1, 25))

    # AI-Generated Technical Analysis
    try:
        ai_summary = generate_ai_summary_sync(record)
        if ai_summary and ai_summary.strip() and "fallback" not in ai_summary.lower():
            ai_heading = Paragraph("🤖 AI-Powered Technical Analysis", heading_style)
            story.append(ai_heading)
            
            ai_para = Paragraph(ai_summary, styles['Normal'])
            story.append(ai_para)
            story.append(Spacer(1, 25))
    except Exception as e:
        print(f"⚠️ AI analysis failed: {e}")

    # Temperature Analysis Chart
    try:
        chart_file = create_temperature_chart_for_record(record)
        if chart_file and os.path.exists(chart_file):
            chart_heading = Paragraph("📊 Temperature Analysis Chart", heading_style)
            story.append(chart_heading)
            
            # Import RLImage for embedding charts
            from reportlab.platypus import Image as RLImage
            
            chart_img = RLImage(chart_file, width=6*inch, height=3.75*inch)
            story.append(chart_img)
            story.append(Spacer(1, 25))
            
            # Defer cleanup until after PDF is built
            temp_images.append(chart_file)
    except Exception as e:
        print(f"⚠️ Chart generation failed: {e}")

    # Recommendations Section
    recommendations_heading = Paragraph("💡 Recommendations & Next Steps", heading_style)
    story.append(recommendations_heading)
    
    if fault_level == 'CRITICAL' and priority == 'CRITICAL':
        recommendations_text = """<b>IMMEDIATE ACTION REQUIRED:</b> Critical alert detected on high-voltage infrastructure requiring immediate response.
        
<b>Recommended Actions:</b>
• Deploy emergency inspection teams to the affected location within 2 hours
• Implement load reduction protocols if applicable
• Prepare backup power routing contingencies
• Schedule detailed thermal imaging follow-up within 24 hours
• Coordinate with operations team for potential equipment de-energization
        """
    elif fault_level == 'CRITICAL':
        recommendations_text = """<b>PRIORITY ATTENTION:</b> Critical thermal condition requiring expedited response.
        
<b>Recommended Actions:</b>
• Schedule priority inspections within 8 hours
• Monitor affected equipment for trending issues
• Review load conditions and operational parameters
• Plan maintenance interventions as needed
• Document thermal patterns for analysis
        """
    elif fault_level == 'WARNING':
        recommendations_text = """<b>MONITORING REQUIRED:</b> Elevated thermal condition requiring attention.
        
<b>Recommended Actions:</b>
• Schedule routine inspections within 48 hours
• Continue monitoring for thermal trends
• Review equipment loading and environmental factors
• Update maintenance schedules as appropriate
• Document baseline conditions for comparison
        """
    else:
        recommendations_text = """<b>NORMAL OPERATION:</b> No thermal anomalies detected. Continue routine monitoring protocols.
        
<b>Recommended Actions:</b>
• Maintain current inspection schedules
• Continue automated thermal monitoring
• Review and update threshold parameters quarterly
• Document normal operating baselines for trending
        """
    
    recommendations_para = Paragraph(recommendations_text, styles['Normal'])
    story.append(recommendations_para)
    story.append(Spacer(1, 20))
    
    # Footer with system information
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=1,  # Center
        spaceBefore=30
    )
    
    footer_text = f"""Thermal Eye v2.0 | Dynamic Thresholds: Equipment-specific analysis | 
    Report ID: {record.id} | Analysis Status: {record.analysis_status or 'N/A'}"""
    
    footer = Paragraph(footer_text, footer_style)
    story.append(footer)

    try:
        doc.build(story)
        print(f"✅ Comprehensive PDF report generated: {pdf_path}")
    except Exception as e:
        print(f"❌ PDF generation failed: {e}")
        # Fallback minimal PDF
        story = [
            Paragraph("Thermal Inspection Report - Simplified", styles['Title']),
            Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']),
            Paragraph(f"Fault Level: {fault_level}", styles['Normal']),
            Paragraph(f"Priority: {priority}", styles['Normal'])
        ]
        doc.build(story)
    finally:
        # Cleanup temporary images
        for img_path in temp_images:
            try:
                if os.path.exists(img_path):
                    os.unlink(img_path)
            except Exception:
                pass

    return pdf_path

def generate_combined_pdf(reports: List[ThermalReport]) -> str:
    """Generate a combined PDF report for multiple records with enhanced formatting."""
    try:
        os.makedirs(REPORTS_DIR, exist_ok=True)
    except Exception:
        pass
    
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    pdf_path = os.path.join(REPORTS_DIR, f"combined_report_{ts}.pdf")
    
    try:
        # Use enhanced PDF generation
        from app.pdf_utils import create_combined_pdf_enhanced
        return create_combined_pdf_enhanced(reports, pdf_path)
    except ImportError:
        print("⚠️ Enhanced PDF utils not available, using fallback")
    except Exception as e:
        print(f"⚠️ Enhanced PDF generation failed: {e}, using fallback")
    
    # Fallback to original implementation with fixes
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
    )
    story = []
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, alignment=1)
    story.append(Paragraph("Thermal Inspection Combined Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 12))

    total = len(reports)
    critical = len([r for r in reports if r.fault_level == 'CRITICAL'])
    warning = len([r for r in reports if r.fault_level == 'WARNING'])
    normal = len([r for r in reports if r.fault_level == 'NORMAL'])
    failed = len([r for r in reports if r.analysis_status != 'success'])

    summary = [
        ['Metric', 'Count'],
        ['Total Images', str(total)],
        ['CRITICAL', str(critical)],
        ['WARNING', str(warning)],
        ['NORMAL', str(normal)],
        ['Failed', str(failed)],
    ]
    tbl = Table(summary, colWidths=[2.2 * inch, 3.8 * inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.darkblue),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 12))

    # Fixed detailed table with proper column width calculation
    rows = [['Image', 'Temp (°C)', 'ΔT (°C)', 'Threshold (°C)', 'Status', 'Tower (Camp)']]
    for r in reports:
        # Safely format each column with text wrapping for long content
        image_name = os.path.basename(r.image_path) if r.image_path else f"ID {r.id}"
        if len(image_name) > 15:  # Truncate long filenames
            image_name = image_name[:12] + "..."
        
        temp_str = f"{r.image_temp:.1f}" if r.image_temp is not None else 'N/A'
        delta_str = f"{r.delta_t:+.1f}" if r.delta_t is not None else 'N/A'
        threshold_str = f"{r.threshold_used:.1f}" if r.threshold_used is not None else 'N/A'
        status_str = r.fault_level or 'N/A'
        
        # Truncate tower info to prevent overflow
        tower_info = f"{r.tower_name or 'N/A'}"
        if r.camp_name:
            tower_info += f" ({r.camp_name})"
        if len(tower_info) > 25:  # Limit to prevent overflow
            tower_info = tower_info[:22] + "..."
        
        rows.append([
            image_name,
            temp_str,
            delta_str,
            threshold_str,
            status_str,
            tower_info
        ])
    
    # Recalculated column widths to fit within available space (7.2 inches)
    # Adjusted proportions to prevent overlap
    dt = Table(
        rows,
        colWidths=[1.2*inch, 0.8*inch, 0.8*inch, 0.9*inch, 0.7*inch, 2.8*inch],
        repeatRows=1,
    )
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('ALIGN', (1, 1), (4, -1), 'CENTER'),  # Center align numeric columns
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),   # Top align to handle wrapped text
        ('FONTSIZE', (0, 0), (-1, 0), 9),      # Smaller header font
        ('FONTSIZE', (0, 1), (-1, -1), 8),     # Smaller data font
        ('LEFTPADDING', (0, 0), (-1, -1), 3),  # Reduce padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(dt)
    story.append(Spacer(1, 12))

    try:
        doc.build(story)
        print(f"✅ Combined PDF generated: {pdf_path}")
    except Exception as e:
        print(f"❌ Combined PDF build failed: {e}")
        # Create minimal fallback
        try:
            doc = SimpleDocTemplate(pdf_path, pagesize=letter)
            minimal_story = [
                Paragraph("Combined Report (Fallback)", styles['Title']),
                Spacer(1, 20),
                Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']),
                Paragraph(f"Total Reports: {total}", styles['Normal']),
                Paragraph(f"Critical: {critical}, Warning: {warning}, Normal: {normal}", styles['Normal'])
            ]
            doc.build(minimal_story)
            print(f"✅ Fallback PDF generated: {pdf_path}")
        except Exception as fallback_error:
            print(f"❌ Even fallback PDF failed: {fallback_error}")
            raise fallback_error

    return pdf_path

def _process_and_store_image(image_bytes: bytes, original_filename: str, db: Session) -> Tuple[ThermalReport, Optional[Dict[str, Any]]]:
    """Process one image (save, analyze, store) and return DB record and nearest tower."""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = (original_filename.split('.')[-1].lower() if '.' in original_filename else 'jpg')
    image_path = f"{UPLOAD_FOLDER}/{file_id}.{ext}"
    with open(image_path, 'wb') as f:
        f.write(image_bytes)

    lat, lon = extract_gps_from_image(image_path)
    image_temp = extract_temperature_from_image(image_path)
    ambient_temp = get_weather_temperature()

    nearest_tower = None
    if lat and lon:
        nearest_tower = find_nearest_tower(lat, lon)

    delta_t = None
    threshold_used = 5.0
    fault_level = 'NORMAL'
    analysis_status = 'failed'

    if image_temp and nearest_tower:
        threshold_used = excel_integrator.get_dynamic_threshold(nearest_tower.get('tower_name', ''), nearest_tower.get('camp_name', ''))
        delta_t = image_temp - ambient_temp
        fault_level = classify_fault_level(delta_t, threshold_used, nearest_tower.get('priority', 'MEDIUM'))
        analysis_status = 'success'
    elif image_temp:
        delta_t = image_temp - ambient_temp
        if delta_t > threshold_used:
            fault_level = 'WARNING'
        analysis_status = 'partial'

    record = ThermalReport(
        tower_id=nearest_tower['tower_id'] if nearest_tower else None,
        tower_name=nearest_tower['tower_name'] if nearest_tower else None,
        camp_name=nearest_tower['camp_name'] if nearest_tower else None,
        latitude=lat,
        longitude=lon,
        image_temp=image_temp,
        ambient_temp=ambient_temp,
        delta_t=delta_t,
        threshold_used=threshold_used,
        fault_level=fault_level,
        priority=nearest_tower['priority'] if nearest_tower else 'MEDIUM',
        voltage_kv=nearest_tower['voltage_kv'] if nearest_tower else None,
        capacity_amps=nearest_tower['capacity_amps'] if nearest_tower else None,
        commissioning_year=nearest_tower['commissioning_year'] if nearest_tower else None,
        distance_km=nearest_tower['distance_km'] if nearest_tower else None,
        image_path=image_path,
        analysis_status=analysis_status
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, nearest_tower

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Thermal Eye API is running", "version": "1.0.0", "towers_loaded": len(towers_df)}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }



def validate_uploaded_file(file: UploadFile) -> None:
    """Validate uploaded file for security and format compliance"""
    # Check file extension
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only {', '.join(allowed_extensions)} files are allowed."
        )
    
    # Check file size (10MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    content = file.file.read()
    file.file.seek(0)  # Reset file pointer
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )
    
    # Verify file is actually an image by opening it
    try:
        file.file.seek(0)
        image = Image.open(file.file)
        image.verify()  # Verify it's a valid image
        file.file.seek(0)  # Reset for further processing
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file. File appears to be corrupted or not a valid image."
        )

@app.post("/upload", response_model=UploadResponse)
async def upload_thermal_image(
    request: Request,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Upload and analyze thermal image.
    Returns complete analysis including nearest tower, temperature analysis, and fault classification.
    """
    # Apply upload-specific rate limiting
    upload_rate_limit.check_rate_limit(request)
    
    # Validate file
    validate_uploaded_file(file)

    # Save uploaded file
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1].lower()
    image_path = f"{UPLOAD_FOLDER}/{file_id}.{file_extension}"
    
    try:
        # Read content and validate size, then save
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size: 10MB.")
        with open(image_path, "wb") as buffer:
            buffer.write(content)
        
        # Extract GPS coordinates
        lat, lon = extract_gps_from_image(image_path)
        
        # Extract temperature
        image_temp = extract_temperature_from_image(image_path)
        
        # Get weather data
        ambient_temp = get_weather_temperature()
        
        # Find nearest tower
        nearest_tower = None
        if lat and lon:
            nearest_tower = find_nearest_tower(lat, lon)
        
        # Calculate analysis
        delta_t = None
        threshold_used = 5.0  # Default
        fault_level = "NORMAL"
        analysis_status = "failed"
        
        if image_temp and nearest_tower:
            # Get dynamic threshold
            threshold_used = excel_integrator.get_dynamic_threshold(nearest_tower.get('tower_name', ''), nearest_tower.get('camp_name', ''))
            delta_t = image_temp - ambient_temp
            fault_level = classify_fault_level(delta_t, threshold_used, nearest_tower.get('priority', 'MEDIUM'))
            analysis_status = "success"
        elif image_temp:
            delta_t = image_temp - ambient_temp
            fault_level = classify_fault_level(delta_t, threshold_used, "MEDIUM")
            analysis_status = "partial"  # No tower found but temperature extracted
        
        # Create database record
        db_report = ThermalReport(
            tower_id=nearest_tower['tower_id'] if nearest_tower else None,
            tower_name=nearest_tower['tower_name'] if nearest_tower else None,
            camp_name=nearest_tower['camp_name'] if nearest_tower else None,
            latitude=lat,
            longitude=lon,
            image_temp=image_temp,
            ambient_temp=ambient_temp,
            delta_t=delta_t,
            threshold_used=threshold_used,
            fault_level=fault_level,
            priority=nearest_tower['priority'] if nearest_tower else 'MEDIUM',
            voltage_kv=nearest_tower['voltage_kv'] if nearest_tower else None,
            capacity_amps=nearest_tower['capacity_amps'] if nearest_tower else None,
            commissioning_year=nearest_tower['commissioning_year'] if nearest_tower else None,
            distance_km=nearest_tower['distance_km'] if nearest_tower else None,
            image_path=image_path,
            analysis_status=analysis_status
        )
        
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        # Generate PDF for this record
        nearest_for_pdf = nearest_tower if nearest_tower else None
        try:
            pdf_path = generate_pdf_report_for_record(db_report, nearest_for_pdf)
            print(f"📄 PDF report generated: {pdf_path}")
        except Exception as e:
            print(f"⚠️ PDF generation failed: {e}")
        
        # Send critical alert email if needed
        if fault_level == "CRITICAL":
            report_dict = {
                'tower_name': db_report.tower_name,
                'camp_name': db_report.camp_name,
                'latitude': db_report.latitude,
                'longitude': db_report.longitude,
                'image_temp': db_report.image_temp,
                'ambient_temp': db_report.ambient_temp,
                'delta_t': db_report.delta_t,
                'threshold_used': db_report.threshold_used,
                'voltage_kv': db_report.voltage_kv,
                'capacity_amps': db_report.capacity_amps,
                'priority': db_report.priority,
                'distance_km': db_report.distance_km
            }
            # Send AI-enhanced email with PDF attachment
            try:
                ai_body = await generate_email_ai_summary(report_dict)
                msg = MIMEMultipart()
                msg['From'] = SMTP_USER
                msg['To'] = ', '.join(ALERT_RECIPIENTS)
                msg['Subject'] = f"🚨 CRITICAL Thermal Alert - {report_dict.get('tower_name', 'Unknown Tower')}"
                msg.attach(MIMEText(ai_body, 'plain'))

                # Attach PDF if exists
                try:
                    pdf_file_path = os.path.join(REPORTS_DIR, f"thermal_report_{db_report.id}.pdf")
                    with open(pdf_file_path, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename=thermal_report_{db_report.id}.pdf')
                    msg.attach(part)
                except Exception as e:
                    print(f"⚠️ Could not attach PDF: {e}")

                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                for recipient in ALERT_RECIPIENTS:
                    server.sendmail(SMTP_USER, recipient, msg.as_string())
                server.quit()
                print("✅ Critical email with AI body and PDF sent")
            except Exception as e:
                print(f"❌ Failed sending AI email with PDF: {e}")
        
        # Return response
        response = UploadResponse(
            id=db_report.id,
            tower_id=db_report.tower_id,
            tower_name=db_report.tower_name,
            camp_name=db_report.camp_name,
            latitude=db_report.latitude,
            longitude=db_report.longitude,
            image_temp=db_report.image_temp,
            ambient_temp=db_report.ambient_temp,
            delta_t=db_report.delta_t,
            threshold_used=db_report.threshold_used,
            fault_level=db_report.fault_level,
            priority=db_report.priority,
            voltage_kv=db_report.voltage_kv,
            capacity_amps=db_report.capacity_amps,
            distance_km=db_report.distance_km,
            timestamp=db_report.timestamp,
            analysis_status=db_report.analysis_status
        )
        
        # Create audit log entry
        audit_log = AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            action="UPLOAD_IMAGE",
            resource=file.filename,
            details=f"Tower: {db_report.tower_name}, Analysis: {fault_level}",
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None
        )
        db.add(audit_log)
        db.commit()

        logger.info(
            "Image uploaded successfully",
            user_id=current_user.id,
            report_id=db_report.id,
            filename=file.filename,
            tower_name=db_report.tower_name,
            fault_level=fault_level
        )
        
        print(f"✅ Image analysis completed: {fault_level} - {db_report.tower_name or 'No tower'}")
        return response
        
    except Exception as e:
        logger.error(
            "Upload processing failed",
            user_id=current_user.id,
            filename=file.filename,
            error=str(e),
            exc_info=True
        )
        # Clean up file on error
        if os.path.exists(image_path):
            os.remove(image_path)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/reports", response_model=List[ReportSummary])
async def get_reports(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Get list of all thermal inspection reports."""
    
    reports = db.query(ThermalReport).order_by(ThermalReport.timestamp.desc()).all()
    
    return [
        ReportSummary(
            id=report.id,
            tower_name=report.tower_name,
            camp_name=report.camp_name,
            latitude=report.latitude,
            longitude=report.longitude,
            fault_level=report.fault_level,
            priority=report.priority,
            image_temp=report.image_temp,
            delta_t=report.delta_t,
            threshold_used=report.threshold_used,
            voltage_kv=report.voltage_kv,
            timestamp=report.timestamp
        )
        for report in reports
    ]

@app.get("/generate_report/{report_id}", response_model=DetailedReport)
async def generate_detailed_report(
    report_id: int, 
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Generate detailed AI-powered report for a specific thermal inspection."""
    
    # Get report from database
    report = db.query(ThermalReport).filter(ThermalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Generate AI summary
    ai_summary = await generate_ai_summary(report)
    # Generate or ensure PDF exists
    pdf_path = generate_pdf_report_for_record(report, None)
    
    # Return detailed report
    report_data = UploadResponse(
        id=report.id,
        tower_id=report.tower_id,
        tower_name=report.tower_name,
        camp_name=report.camp_name,
        latitude=report.latitude,
        longitude=report.longitude,
        image_temp=report.image_temp,
        ambient_temp=report.ambient_temp,
        delta_t=report.delta_t,
        threshold_used=report.threshold_used,
        fault_level=report.fault_level,
        priority=report.priority,
        voltage_kv=report.voltage_kv,
        capacity_amps=report.capacity_amps,
        distance_km=report.distance_km,
        timestamp=report.timestamp,
        analysis_status=report.analysis_status
    )
    
    return DetailedReport(
        report_data=report_data,
        ai_summary=ai_summary,
        pdf_path=pdf_path
    )

@app.post("/upload_batch", response_model=BatchUploadResponse)
async def upload_batch(
    request: Request,
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Upload and analyze multiple images, returning combined results and a PDF report."""
    # Apply upload-specific rate limiting (stricter for batch)
    upload_rate_limit.check_rate_limit(request)
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    # Validate all files first
    for file in files:
        validate_uploaded_file(file)

    reports: List[ThermalReport] = []
    responses: List[UploadResponse] = []

    for f in files:
        if not f.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue
        content = await f.read()
        if len(content) == 0:
            continue
        rec, nearest = _process_and_store_image(content, f.filename, db)
        reports.append(rec)
        responses.append(UploadResponse(
            id=rec.id,
            tower_id=rec.tower_id,
            tower_name=rec.tower_name,
            camp_name=rec.camp_name,
            latitude=rec.latitude,
            longitude=rec.longitude,
            image_temp=rec.image_temp,
            ambient_temp=rec.ambient_temp,
            delta_t=rec.delta_t,
            threshold_used=rec.threshold_used,
            fault_level=rec.fault_level,
            priority=rec.priority,
            voltage_kv=rec.voltage_kv,
            capacity_amps=rec.capacity_amps,
            distance_km=rec.distance_km,
            timestamp=rec.timestamp,
            analysis_status=rec.analysis_status
        ))

    if not reports:
        raise HTTPException(status_code=400, detail="No valid images processed")

    # Generate combined PDF
    combined_pdf = generate_combined_pdf(reports)

    # Counts
    critical = len([r for r in reports if r.fault_level == 'CRITICAL'])
    warning = len([r for r in reports if r.fault_level == 'WARNING'])
    normal = len([r for r in reports if r.fault_level == 'NORMAL'])
    failed = len([r for r in reports if r.analysis_status != 'success'])

    # Send batch email summary if any CRITICAL or significant findings
    if (critical > 0 or warning > 0) and SMTP_PASSWORD and SMTP_USER:
        try:
            from app.email_templates import generate_batch_alert_email
            
            # Prepare top critical faults data
            top_critical_faults = []
            for r in [report for report in reports if report.fault_level == 'CRITICAL'][:5]:
                top_critical_faults.append({
                    'tower_name': r.tower_name,
                    'camp_name': r.camp_name,
                    'image_temp': r.image_temp,
                    'delta_t': r.delta_t,
                    'threshold_used': r.threshold_used,
                    'id': r.id
                })
            
            # Generate AI summary for batch (optional enhancement)
            ai_summary = ""
            if critical > 0:
                ai_summary = f"Batch analysis indicates {critical} critical thermal anomalies requiring immediate attention. Priority focus on equipment with highest temperature exceedances."
            
            # Generate professional batch email
            subject, html_body, text_body = generate_batch_alert_email(
                critical_count=critical,
                warning_count=warning, 
                normal_count=normal,
                total_count=len(reports),
                top_critical_faults=top_critical_faults,
                ai_summary=ai_summary
            )
            
            # Create multipart message
            msg = MIMEMultipart('alternative')
            msg['From'] = SMTP_USER
            msg['To'] = ', '.join(ALERT_RECIPIENTS)
            msg['Subject'] = subject
            
            # Attach both HTML and plaintext versions
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            html_part = MIMEText(html_body, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)

            # Attach combined PDF if available  
            if combined_pdf and os.path.exists(combined_pdf):
                try:
                    with open(combined_pdf, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename={os.path.basename(combined_pdf)}')
                    msg.attach(part)
                except Exception as e:
                    print(f"⚠️ Could not attach combined PDF: {e}")

            # Send with proper error handling
            try:
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                for recipient in ALERT_RECIPIENTS:
                    server.sendmail(SMTP_USER, recipient, msg.as_string())
                server.quit()
                print(f"✅ Batch email summary sent ({critical} critical, {warning} warning)")
                
            except smtplib.SMTPException as smtp_error:
                print(f"❌ SMTP error sending batch email: {smtp_error}")
                # Save to backup
                try:
                    os.makedirs('/tmp/outbox', exist_ok=True)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    backup_path = f"/tmp/outbox/batch_alert_{timestamp}.eml"
                    with open(backup_path, 'w', encoding='utf-8') as f:
                        f.write(msg.as_string())
                    print(f"📧 Batch email saved to backup: {backup_path}")
                except Exception as backup_error:
                    print(f"⚠️ Failed to save batch email backup: {backup_error}")
                    
        except Exception as e:
            print(f"❌ Failed to generate/send batch email: {e}")

    return BatchUploadResponse(
        results=responses,
        total=len(reports),
        critical=critical,
        warning=warning,
        normal=normal,
        failed=failed,
        pdf_path=combined_pdf
    )

async def generate_ai_summary(report: ThermalReport) -> str:
    """Generate AI-powered summary using OpenRouter API."""
    
    if not OPENROUTER_API_KEY:
        return generate_fallback_summary(report)
    
    # Create structured prompt with safe values to avoid 'None°C'
    def fmt(v, unit=""):
        return f"{v}{unit}" if v is not None else "N/A"

    # Enhanced prompt for more detailed technical analysis
    equipment_age = "Unknown"
    if report.commissioning_year:
        try:
            year = int(report.commissioning_year)
            equipment_age = datetime.now().year - year
        except (ValueError, TypeError):
            equipment_age = "Unknown"
    
    prompt = f"""
    You are a senior electrical engineer conducting a detailed thermal analysis of critical power infrastructure. Analyze this thermal inspection data and provide a comprehensive technical assessment.

    EQUIPMENT SPECIFICATIONS:
    - Tower/Substation: {report.tower_name or 'Unknown'} at {report.camp_name or 'Unknown Camp'}
    - Voltage Level: {fmt(report.voltage_kv, 'kV')} transmission line
    - Current Capacity: {fmt(report.capacity_amps, 'A')} rated capacity
    - Equipment Age: {equipment_age} years (commissioned {report.commissioning_year or 'N/A'})
    - Priority Classification: {report.priority or 'N/A'}

    THERMAL ANALYSIS DATA:
    - Measured Temperature: {fmt(report.image_temp, '°C')}
    - Ambient Temperature: {fmt(report.ambient_temp, '°C')}
    - Temperature Rise: +{fmt(report.delta_t, '°C')} above ambient
    - Dynamic Threshold: {fmt(report.threshold_used, '°C')} (based on equipment specifications)
    - Fault Classification: {report.fault_level or 'N/A'}

    Write exactly 5 sections with this specific format:

    1. THERMAL CONDITION ANALYSIS
    [2-3 sentences evaluating thermal signature against IEEE standards, thermal loading patterns, and heat dissipation mechanisms]

    2. ROOT CAUSE ASSESSMENT
    [2-3 sentences analyzing potential causes including conductor degradation, connection issues, insulator contamination, or overloading conditions]

    3. RISK EVALUATION
    [2-3 sentences assessing immediate and long-term risks including equipment failure probability, safety hazards, and system stability impacts]

    4. TECHNICAL RECOMMENDATIONS
    [2-3 sentences providing specific engineering recommendations including inspection priorities, maintenance schedules, and load management strategies]

    5. COMPLIANCE & STANDARDS
    [2-3 sentences referencing relevant standards like IEEE 738, IEC 60826, and maintenance practices with specific timelines]

    CRITICAL FORMATTING REQUIREMENTS:
    - Use the exact numbered format shown above (1. THERMAL CONDITION ANALYSIS, etc.)
    - Put one blank line between each section
    - Each section has exactly 2-3 sentences
    - No bullet points, no markdown formatting (**, ###, etc.)
    - Use technical terminology appropriate for electrical engineers
    - Include specific action timelines where relevant
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/thermal-eye/api",
            "X-Title": "Thermal Inspection AI Analysis"
        }
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": "You are a senior electrical engineer with 20+ years of experience in power transmission systems, thermal analysis, and predictive maintenance. Provide detailed, technical assessments using industry-standard terminology."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 600,  # Increased for detailed analysis
            "temperature": 0.3,  # Lower for more focused, technical content
            "top_p": 0.9
        }
        
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        ai_content = result['choices'][0]['message']['content']
        
        # Clean up formatting for detailed report content
        ai_content = clean_ai_content(ai_content, is_email=False)
        
        return ai_content
        
    except Exception as e:
        print(f"AI summary generation failed: {e}")
        return generate_fallback_summary(report)

def generate_fallback_summary(report: ThermalReport) -> str:
    """Generate enhanced rule-based technical summary when AI is unavailable."""
    
    equipment_age = "unknown"
    if report.commissioning_year:
        try:
            year = int(report.commissioning_year)
            equipment_age = datetime.now().year - year
        except (ValueError, TypeError):
            equipment_age = "unknown"
    
    if report.fault_level == "CRITICAL":
        return f"""1. EQUIPMENT IDENTIFICATION
{report.tower_name or 'Transmission Tower'} at {report.camp_name or 'Substation'} ({report.voltage_kv or 'N/A'}kV, {report.capacity_amps or 'N/A'}A capacity, {equipment_age} years service). This critical infrastructure component requires immediate assessment given its operational significance and current thermal condition.

2. THERMAL ANALYSIS
Measured temperature of {report.image_temp or 'N/A'}°C represents a critical +{abs(report.delta_t or 0):.1f}°C deviation above the dynamic threshold of {report.threshold_used or 'N/A'}°C. This thermal signature indicates severe equipment stress with immediate failure risk and potential for cascading system impacts.

3. RISK ASSESSMENT
The thermal elevation exceeds IEEE 738 recommended operating parameters, presenting imminent risk of conductor annealing, connection failure, or insulation breakdown. Given the {report.priority or 'HIGH'} priority classification and system voltage level, cascading failure potential exists with significant operational consequences.

4. IMMEDIATE ACTIONS REQUIRED
Emergency load reduction to 70% capacity within 2 hours, thermographic re-inspection within 4 hours, detailed visual inspection of connections and insulators. Consider equipment isolation if temperature continues rising, and notify operations control center and maintenance crews for coordinated response.

5. STANDARDS COMPLIANCE
Action required per IEEE C57.91 and IEC 60076 thermal monitoring guidelines. Immediate response protocols must be initiated to prevent equipment failure and maintain system reliability standards."""
    elif report.fault_level == "WARNING":
        return f"""1. EQUIPMENT IDENTIFICATION
{report.tower_name or 'Transmission Tower'} at {report.camp_name or 'Substation'} ({report.voltage_kv or 'N/A'}kV system, {report.capacity_amps or 'N/A'}A rated capacity). This equipment shows elevated thermal characteristics that warrant enhanced monitoring and proactive maintenance consideration.

2. THERMAL ANALYSIS
Measured temperature of {report.image_temp or 'N/A'}°C indicates moderate thermal stress with +{abs(report.delta_t or 0):.1f}°C excess above baseline. This represents developing thermal stress patterns requiring monitoring and preventive intervention to prevent escalation.

3. RISK ASSESSMENT
Current thermal profile suggests progressive degradation of electrical connections or increased loading conditions. While not immediately critical, continued monitoring is essential to prevent escalation to failure conditions and maintain operational reliability.

4. RECOMMENDED ACTIONS
Schedule detailed inspection within 24-48 hours, implement enhanced thermal monitoring protocols, review loading patterns and consider load balancing. Verify connection integrity during next maintenance window, and document baseline for trending analysis.

5. MONITORING PROTOCOL
Continue thermal surveillance per IEEE 738 guidelines with weekly re-assessment. Establish temperature trending protocols to identify progressive deterioration patterns and optimize maintenance scheduling."""
    else:
        return f"""1. EQUIPMENT IDENTIFICATION
{report.tower_name or 'Transmission Tower'} at {report.camp_name or 'Substation'} ({report.voltage_kv or 'N/A'}kV infrastructure, {equipment_age} years service). Current thermal inspection confirms equipment is operating within normal parameters and design specifications.

2. THERMAL ANALYSIS
Current temperature reading of {report.image_temp or 'N/A'}°C remains within acceptable operating parameters, with thermal signature {abs(report.delta_t or 0):.1f}°C within dynamic threshold limits. This indicates stable thermal performance consistent with normal equipment operation and proper heat dissipation.

3. EQUIPMENT STATUS
Thermal profile demonstrates healthy equipment condition with proper heat dissipation characteristics and no signs of thermal stress. No immediate maintenance concerns identified based on current thermal signature analysis.

4. MAINTENANCE SCHEDULE
Continue routine maintenance per standard operating procedures and manufacturer recommendations. Next thermal inspection recommended within normal surveillance intervals based on IEEE guidelines and operational requirements.

5. OPERATIONAL STATUS
Equipment approved for continued normal operation under current loading conditions. Thermal baseline established for future comparative analysis and trending assessment."""

@app.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Delete a specific thermal inspection report."""
    report = db.query(ThermalReport).filter(ThermalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.image_path:
        try:
            pdf_path = report.image_path.replace('.jpg', '.pdf').replace('.jpeg', '.pdf').replace('.png', '.pdf')
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
        except Exception as e:
            print(f"Warning: Could not delete PDF file: {e}")
    
    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully"}

@app.delete("/reports/batch")
async def delete_reports_batch(
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Delete multiple thermal inspection reports."""
    body = await request.json()
    report_ids = body.get("ids", [])
    
    if not report_ids:
        raise HTTPException(status_code=400, detail="No report IDs provided")
    
    deleted_count = 0
    for report_id in report_ids:
        report = db.query(ThermalReport).filter(ThermalReport.id == report_id).first()
        if report:
            if report.image_path:
                try:
                    pdf_path = report.image_path.replace('.jpg', '.pdf').replace('.jpeg', '.pdf').replace('.png', '.pdf')
                    if os.path.exists(pdf_path):
                        os.remove(pdf_path)
                except Exception as e:
                    print(f"Warning: Could not delete PDF file: {e}")
            
            db.delete(report)
            deleted_count += 1
    
    db.commit()
    return {"message": f"Deleted {deleted_count} reports successfully"}

@app.get("/reports/{report_id}/fault_progression")
async def get_fault_progression(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Get fault progression data for radar chart."""
    report = db.query(ThermalReport).filter(ThermalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Find all reports with same tower_id and fault_level
    related_reports = db.query(ThermalReport).filter(
        ThermalReport.tower_id == report.tower_id,
        ThermalReport.fault_level == report.fault_level,
        ThermalReport.tower_id.isnot(None)
    ).order_by(ThermalReport.timestamp.asc()).all()
    
    progression_data = []
    for r in related_reports:
        progression_data.append({
            'date': r.timestamp.isoformat(),
            'temperature': r.image_temp or 0,
            'threshold': r.threshold_used or 5,
            'delta_t': r.delta_t or 0
        })
    
    return progression_data

@app.put("/settings/email_recipients")
async def update_email_recipients(
    recipients: List[str],
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """Update email alert recipients."""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    valid_recipients = []
    for email in recipients:
        email = email.strip()
        if email and re.match(email_pattern, email):
            valid_recipients.append(email)
    
    if not valid_recipients:
        raise HTTPException(status_code=400, detail="No valid email addresses provided")
    
    global ALERT_RECIPIENTS
    ALERT_RECIPIENTS = valid_recipients
    
    return {"message": f"Updated email recipients: {', '.join(valid_recipients)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
