#!/usr/bin/env python3
"""
Configuration settings for Thermal Eye backend.
All configurable parameters and settings.
"""

import os
from typing import Tuple
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Database Configuration
# Using SQLite for simplicity (change to PostgreSQL for production)
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./thermal_eye.db')

# API Keys (read from environment)
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Authentication Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', '480'))  # 8 hours
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# File Paths
TOWERS_CSV_PATH = "data/towers.csv"
SAMPLE_IMAGES_PATH = "data/flir_images"
UPLOAD_FOLDER = "uploads"
REPORTS_DIR = "reports"

# Temperature thresholds are now dynamic based on tower metadata
# Using existing dynamic threshold calculation from excel_data_integrator

# Mumbai coordinates for weather API
MUMBAI_LAT = 19.07611
MUMBAI_LON = 72.87750

# Image processing settings
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# OCR settings
OCR_CONFIDENCE_THRESHOLD = float(os.environ.get('OCR_CONFIDENCE_THRESHOLD', '0.4'))  # Lowered for better detection
OCR_TEMPERATURE_RANGE = (20, 80)  # Reasonable temperature range in Celsius
OCR_REGION = os.environ.get('OCR_REGION', 'top_left')  # top_left|top_right|full
OCR_TOP_FRACTION = float(os.environ.get('OCR_TOP_FRACTION', '0.4'))
OCR_SIDE_FRACTION = float(os.environ.get('OCR_SIDE_FRACTION', '0.5'))  # width fraction for left/right

# Enhanced OCR preprocessing settings (conservative defaults)
OCR_SCALE_FACTOR = float(os.environ.get('OCR_SCALE_FACTOR', '1.5'))  # Moderate scaling for better OCR
OCR_SHARPNESS_FACTOR = float(os.environ.get('OCR_SHARPNESS_FACTOR', '1.2'))  # Light sharpness enhancement
OCR_USE_MORPHOLOGY = os.environ.get('OCR_USE_MORPHOLOGY', 'false').lower() == 'true'  # Disabled by default
OCR_USE_ADAPTIVE_THRESHOLD = os.environ.get('OCR_USE_ADAPTIVE_THRESHOLD', 'false').lower() == 'true'  # Disabled by default
OCR_USE_ENHANCED_PREPROCESSING = os.environ.get('OCR_USE_ENHANCED_PREPROCESSING', 'false').lower() == 'true'  # Master toggle

# Email settings
ALERT_EMAIL_RECIPIENT = "singhpranav431@gmail.com"

# OpenRouter API settings
# Using budget-friendly but powerful model for better performance
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', "meta-llama/llama-3.1-8b-instruct")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Alternative budget models for fallback:
# - google/gemma-2-9b-it
# - qwen/qwen-2.5-7b-instruct  
# - deepseek/deepseek-r1-distill-llama-70b
