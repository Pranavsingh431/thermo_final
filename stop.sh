#!/bin/bash

# 🔥 Thermal Eye - Stop Script
# Gracefully stops all Thermal Eye services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Thermal Eye Services...${NC}"
echo "================================="

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

# Check if Docker is being used
if [ -f "docker-compose.yml" ] && [ "$(docker-compose ps -q)" ]; then
    echo -e "${BLUE}🐳 Stopping Docker services...${NC}"
    docker-compose down
    print_status "Docker services stopped"
    exit 0
fi

# Stop manual deployment
STOPPED_ANY=false

# Stop backend
if [ -f "backend/backend.pid" ]; then
    BACKEND_PID=$(cat backend/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${BLUE}🐍 Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        sleep 2
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_warning "Backend didn't stop gracefully, force killing..."
            kill -9 $BACKEND_PID
        fi
        rm backend/backend.pid
        print_status "Backend stopped"
        STOPPED_ANY=true
    else
        print_warning "Backend PID found but process not running"
        rm backend/backend.pid
    fi
else
    print_warning "Backend PID file not found"
fi

# Stop frontend
if [ -f "frontend/frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${BLUE}⚛️  Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        sleep 2
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_warning "Frontend didn't stop gracefully, force killing..."
            kill -9 $FRONTEND_PID
        fi
        rm frontend/frontend.pid
        print_status "Frontend stopped"
        STOPPED_ANY=true
    else
        print_warning "Frontend PID found but process not running"
        rm frontend/frontend.pid
    fi
else
    print_warning "Frontend PID file not found"
fi

# Kill any remaining processes (fallback)
echo -e "${BLUE}🔍 Checking for remaining processes...${NC}"

# Kill any uvicorn processes
UVICORN_PIDS=$(pgrep -f "uvicorn.*app.main:app" || true)
if [ ! -z "$UVICORN_PIDS" ]; then
    echo -e "${BLUE}🐍 Stopping remaining uvicorn processes...${NC}"
    echo "$UVICORN_PIDS" | xargs kill
    print_status "Stopped remaining backend processes"
    STOPPED_ANY=true
fi

# Kill any npm/serve processes for this project
NPM_PIDS=$(pgrep -f "npm.*start" || true)
SERVE_PIDS=$(pgrep -f "serve.*build" || true)

if [ ! -z "$NPM_PIDS" ]; then
    echo -e "${BLUE}⚛️  Stopping npm processes...${NC}"
    echo "$NPM_PIDS" | xargs kill
    print_status "Stopped npm processes"
    STOPPED_ANY=true
fi

if [ ! -z "$SERVE_PIDS" ]; then
    echo -e "${BLUE}⚛️  Stopping serve processes...${NC}"
    echo "$SERVE_PIDS" | xargs kill
    print_status "Stopped serve processes"
    STOPPED_ANY=true
fi

# Clean up log files
echo -e "${BLUE}🧹 Cleaning up...${NC}"
if [ -f "backend/backend.log" ]; then
    rm backend/backend.log
fi
if [ -f "frontend/frontend.log" ]; then
    rm frontend/frontend.log
fi
print_status "Log files cleaned"

# Final message
echo ""
if [ "$STOPPED_ANY" = true ]; then
    echo -e "${GREEN}🎉 All Thermal Eye services stopped successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  No running services found${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "   Start again: ${YELLOW}./start.sh${NC}"
echo -e "   Start with Docker: ${YELLOW}./start.sh --docker${NC}"
echo -e "   Production mode: ${YELLOW}./start.sh --production${NC}"
echo ""
