#!/bin/bash


set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}🔄 Running database migrations for Thermal Eye...${NC}"

if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_info "Environment variables loaded from .env"
else
    print_warning "No .env file found, using default environment"
fi

if [ ! -f "backend/app/alembic.ini" ]; then
    print_error "alembic.ini not found. Please run this script from the project root."
    exit 1
fi

cd backend

if [ -d "venv" ]; then
    source venv/bin/activate
    print_info "Virtual environment activated"
fi

if [ ! -f "venv/lib/python*/site-packages/alembic" ]; then
    print_info "Installing dependencies..."
    pip install -r requirements.txt
fi

cd app

print_info "Current migration status:"
alembic current

print_info "Running database migrations..."
alembic upgrade head

print_status "Database migrations completed successfully!"

print_info "Final migration status:"
alembic current

echo ""
print_status "Database is now up to date!"
