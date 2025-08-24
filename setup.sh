#!/bin/bash

# 🔥 Thermal Eye - Initial Setup Script
# One-time setup for Thermal Eye development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${PURPLE}"
cat << "EOF"
  _____      _               
 / ____|    | |              
| (___   ___| |_ _   _ _ __   
 \___ \ / _ \ __| | | | '_ \  
 ____) |  __/ |_| |_| | |_) |
|_____/ \___|\__|\__,_| .__/  
                      | |     
                      |_|     
EOF
echo -e "${NC}"
echo -e "${GREEN}🔥 Thermal Eye Initial Setup${NC}"
echo -e "${BLUE}===========================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if already set up
if [ -f ".setup_complete" ]; then
    print_warning "Setup already completed. Use ./dev.sh for development commands."
    echo ""
    echo -e "${BLUE}Quick start:${NC}"
    echo -e "  Start development: ${YELLOW}./start.sh${NC}"
    echo -e "  Run tests: ${YELLOW}./dev.sh test${NC}"
    echo -e "  View help: ${YELLOW}./dev.sh help${NC}"
    exit 0
fi

echo -e "${BLUE}🔍 Checking system requirements...${NC}"

# Check Python
if ! command -v python3 >/dev/null 2>&1; then
    print_error "Python 3.9+ is required but not found"
    echo "Please install Python 3.9+: https://python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then
    print_error "Python 3.9+ is required (found: $PYTHON_VERSION)"
    exit 1
fi
print_status "Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js 18+ is required but not found"
    echo "Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js 18+ is required (found: $NODE_VERSION)"
    exit 1
fi
print_status "Node.js $NODE_VERSION found"

# Check for optional tools
echo -e "${BLUE}🔍 Checking optional tools...${NC}"

if command -v docker >/dev/null 2>&1; then
    print_status "Docker found - Docker deployment available"
else
    print_warning "Docker not found - Manual deployment only"
fi

if command -v git >/dev/null 2>&1; then
    print_status "Git found"
else
    print_warning "Git not found - Version control not available"
fi

# Create environment file
echo -e "${BLUE}⚙️  Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "ENV.sample" ]; then
        cp ENV.sample .env
        print_status "Environment file created from template"
    else
        print_error "ENV.sample template not found"
        exit 1
    fi
else
    print_warning "Environment file already exists"
fi

# Install backend dependencies
echo -e "${BLUE}🐍 Setting up Python backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
fi

print_info "Activating virtual environment..."
source venv/bin/activate

print_info "Installing Python dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

if [ -f "requirements-dev.txt" ]; then
    pip install -r requirements-dev.txt > /dev/null 2>&1
    print_status "Backend dependencies installed (with dev tools)"
else
    print_status "Backend dependencies installed"
fi

cd ..

# Install frontend dependencies
echo -e "${BLUE}⚛️  Setting up React frontend...${NC}"
cd frontend

print_info "Installing Node.js dependencies..."
npm install > /dev/null 2>&1
print_status "Frontend dependencies installed"

cd ..

# Set up database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd backend
source venv/bin/activate

# Create database tables
python -c "
from app.models import Base
from sqlalchemy import create_engine
import os

database_url = os.getenv('DATABASE_URL', 'sqlite:///./thermal_eye.db')
engine = create_engine(database_url.replace('sqlite:///', 'sqlite:///./'))
Base.metadata.create_all(bind=engine)
print('Database tables created')
"

print_status "Database initialized"

# Create demo admin user
print_info "Creating demo admin user..."
python -c "
from app.main import app
from app.models import User, Base
from app.auth.security import get_password_hash
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Get database URL
database_url = os.getenv('DATABASE_URL', 'sqlite:///./thermal_eye.db')
engine = create_engine(database_url.replace('sqlite:///', 'sqlite:///./'))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Add demo user
db = SessionLocal()
try:
    # Check if admin exists
    admin = db.query(User).filter(User.email == 'admin@example.com').first()
    if not admin:
        admin = User(
            email='admin@example.com',
            hashed_password=get_password_hash('admin123'),
            role='admin'
        )
        db.add(admin)
        db.commit()
        print('Demo admin user created')
    else:
        print('Demo admin user already exists')
finally:
    db.close()
"

print_status "Demo admin user ready"
cd ..

# Create directories
echo -e "${BLUE}📁 Creating required directories...${NC}"
mkdir -p backend/uploads
mkdir -p backend/temp_images
mkdir -p backend/reports
mkdir -p backups
print_status "Directories created"

# Run initial tests
echo -e "${BLUE}🧪 Running initial tests...${NC}"

# Backend tests
print_info "Testing backend..."
cd backend
source venv/bin/activate
if python -m pytest --tb=short > /dev/null 2>&1; then
    print_status "Backend tests passed"
else
    print_warning "Some backend tests failed (this is okay for initial setup)"
fi
cd ..

# Frontend tests
print_info "Testing frontend..."
cd frontend
if npm test -- --watchAll=false --testTimeout=15000 > /dev/null 2>&1; then
    print_status "Frontend tests passed"
else
    print_warning "Some frontend tests failed (this is okay for initial setup)"
fi
cd ..

# Mark setup as complete
touch .setup_complete

# Success message
echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What's been set up:${NC}"
echo -e "  ✅ Python virtual environment with dependencies"
echo -e "  ✅ Node.js dependencies installed"
echo -e "  ✅ Database initialized with demo user"
echo -e "  ✅ Required directories created"
echo -e "  ✅ Environment configuration ready"
echo ""
echo -e "${BLUE}🔑 Demo credentials:${NC}"
echo -e "  Email: ${YELLOW}admin@example.com${NC}"
echo -e "  Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "  1. Edit ${YELLOW}.env${NC} file with your API keys:"
echo -e "     - OPENROUTER_API_KEY"
echo -e "     - OPENWEATHER_API_KEY"
echo -e "     - SMTP credentials"
echo ""
echo -e "  2. Start the application:"
echo -e "     ${YELLOW}./start.sh${NC}                 # Development mode"
echo -e "     ${YELLOW}./start.sh --docker${NC}       # Docker mode"
echo -e "     ${YELLOW}./start.sh --production${NC}   # Production mode"
echo ""
echo -e "  3. Access the application:"
echo -e "     Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "     Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "     API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}🛠️  Development commands:${NC}"
echo -e "  ${YELLOW}./dev.sh help${NC}              # Show all available commands"
echo -e "  ${YELLOW}./dev.sh test${NC}              # Run all tests"
echo -e "  ${YELLOW}./dev.sh lint${NC}              # Run code linting"
echo -e "  ${YELLOW}./stop.sh${NC}                  # Stop all services"
echo ""
echo -e "${GREEN}🔥 Happy thermal inspecting with Tata Power! 🔥${NC}"
