#!/bin/bash

# 🔥 Thermal Eye - Production Startup Script
# Automated deployment and startup for Tata Power thermal inspection system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${BLUE}"
cat << "EOF"
  _______ _                           _   ______           
 |__   __| |                         | | |  ____|          
    | |  | |__   ___ _ __ _ __ ___   __ _| | | |__  _   _  ___ 
    | |  | '_ \ / _ \ '__| '_ ` _ \ / _` | | |  __|| | | |/ _ \
    | |  | | | |  __/ |  | | | | | | (_| | | |____| |_| |  __/
    |_|  |_| |_|\___|_|  |_| |_| |_|\__,_|_|______|\__, |\___|
                                                    __/ |     
                                                   |___/      
EOF
echo -e "${NC}"
echo -e "${GREEN}🔥 Professional Thermal Inspection System for Tata Power${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Default values
MODE="development"
SKIP_INSTALL=false
DOCKER_MODE=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--production)
            MODE="production"
            shift
            ;;
        -d|--docker)
            DOCKER_MODE=true
            shift
            ;;
        -s|--skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --production     Run in production mode"
            echo "  -d, --docker         Use Docker deployment"
            echo "  -s, --skip-install   Skip dependency installation"
            echo "  -v, --verbose        Verbose output"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Development mode"
            echo "  $0 --production             # Production mode"
            echo "  $0 --docker                 # Docker deployment"
            echo "  $0 --production --docker    # Production with Docker"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🎯 Configuration:${NC}"
echo -e "   Mode: ${YELLOW}$MODE${NC}"
echo -e "   Docker: ${YELLOW}$DOCKER_MODE${NC}"
echo -e "   Skip Install: ${YELLOW}$SKIP_INSTALL${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

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

# Check prerequisites
echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"

if [ "$DOCKER_MODE" = true ]; then
    if ! command_exists docker; then
        print_error "Docker is required but not installed"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is required but not installed"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_status "Docker and Docker Compose are available"
else
    # Check for Python
    if ! command_exists python3; then
        print_error "Python 3.9+ is required but not found"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then
        print_error "Python 3.9+ is required (found: $PYTHON_VERSION)"
        exit 1
    fi
    print_status "Python $PYTHON_VERSION is available"
    
    # Check for Node.js
    if ! command_exists node; then
        print_error "Node.js 18+ is required but not found"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js 18+ is required (found: $NODE_VERSION)"
        exit 1
    fi
    print_status "Node.js $NODE_VERSION is available"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating from template..."
    if [ -f "ENV.sample" ]; then
        cp ENV.sample .env
        print_status "Created .env from ENV.sample"
        echo -e "${YELLOW}📝 Please edit .env file with your API keys before running${NC}"
    else
        print_error "ENV.sample template not found"
        exit 1
    fi
fi

# Docker deployment
if [ "$DOCKER_MODE" = true ]; then
    echo -e "${BLUE}🐳 Starting Docker Deployment...${NC}"
    
    # Check if containers are already running
    if [ "$(docker-compose ps -q)" ]; then
        print_warning "Containers are already running, stopping them first..."
        docker-compose down
    fi
    
    echo -e "${BLUE}📦 Building containers...${NC}"
    if [ "$VERBOSE" = true ]; then
        docker-compose build
    else
        docker-compose build > /dev/null 2>&1
    fi
    print_status "Containers built successfully"
    
    echo -e "${BLUE}🚀 Starting services...${NC}"
    if [ "$MODE" = "production" ]; then
        docker-compose --profile production up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be healthy
    echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
    sleep 10
    
    # Check service health
    echo -e "${BLUE}🔍 Checking service health...${NC}"
    
    # Check backend
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        echo "Check logs: docker-compose logs backend"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        echo "Check logs: docker-compose logs frontend"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Docker deployment completed!${NC}"
    echo -e "${BLUE}📱 Access your application:${NC}"
    echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "   Backend API: ${YELLOW}http://localhost:8000${NC}"
    echo -e "   API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}📊 Useful commands:${NC}"
    echo -e "   View logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "   Stop services: ${YELLOW}docker-compose down${NC}"
    echo -e "   Restart: ${YELLOW}docker-compose restart${NC}"
    
    exit 0
fi

# Manual deployment
echo -e "${BLUE}🛠️  Starting Manual Deployment...${NC}"

# Backend setup
echo -e "${BLUE}🐍 Setting up backend...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
    print_status "Installing Python dependencies..."
    if [ "$VERBOSE" = true ]; then
        pip install -r requirements.txt
    else
        pip install -r requirements.txt > /dev/null 2>&1
    fi
    print_status "Backend dependencies installed"
fi

# Run database migrations
echo -e "${BLUE}🗄️  Setting up database...${NC}"
if [ -f "app/alembic.ini" ]; then
    cd app
    if alembic current >/dev/null 2>&1; then
        alembic upgrade head
        print_status "Database migrations applied"
    else
        print_warning "Alembic not initialized, creating tables..."
    fi
    cd ..
fi

# Start backend server
echo -e "${BLUE}🚀 Starting backend server...${NC}"
if [ "$MODE" = "production" ]; then
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
else
    nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload > backend.log 2>&1 &
fi

BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
print_status "Backend started (PID: $BACKEND_PID)"

# Wait for backend to start
echo -e "${BLUE}⏳ Waiting for backend to start...${NC}"
sleep 5

# Health check
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    print_status "Backend health check passed"
else
    print_error "Backend health check failed"
    echo "Check logs: tail -f backend/backend.log"
fi

cd ..

# Frontend setup
echo -e "${BLUE}⚛️  Setting up frontend...${NC}"
cd frontend

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
    print_status "Installing Node.js dependencies..."
    if [ "$VERBOSE" = true ]; then
        npm install
    else
        npm install > /dev/null 2>&1
    fi
    print_status "Frontend dependencies installed"
fi

# Start frontend server
echo -e "${BLUE}🚀 Starting frontend server...${NC}"
if [ "$MODE" = "production" ]; then
    # Build for production
    print_status "Building frontend for production..."
    if [ "$VERBOSE" = true ]; then
        npm run build
    else
        npm run build > /dev/null 2>&1
    fi
    
    # Serve with static server
    if command_exists serve; then
        nohup serve -s build -l 3000 > frontend.log 2>&1 &
    else
        print_warning "Installing serve globally..."
        npm install -g serve > /dev/null 2>&1
        nohup serve -s build -l 3000 > frontend.log 2>&1 &
    fi
else
    nohup npm start > frontend.log 2>&1 &
fi

FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid
print_status "Frontend started (PID: $FRONTEND_PID)"

cd ..

# Wait for frontend to start
echo -e "${BLUE}⏳ Waiting for frontend to start...${NC}"
sleep 10

# Final health checks
echo -e "${BLUE}🔍 Running final health checks...${NC}"

if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    print_status "Backend is running"
else
    print_error "Backend is not responding"
fi

if curl -f http://localhost:3000 >/dev/null 2>&1; then
    print_status "Frontend is running"
else
    print_error "Frontend is not responding"
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Thermal Eye deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Access your application:${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "   API Documentation: ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}📊 Process Information:${NC}"
echo -e "   Backend PID: ${YELLOW}$(cat backend/backend.pid 2>/dev/null || echo 'Not found')${NC}"
echo -e "   Frontend PID: ${YELLOW}$(cat frontend/frontend.pid 2>/dev/null || echo 'Not found')${NC}"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "   Stop all: ${YELLOW}./stop.sh${NC}"
echo -e "   View backend logs: ${YELLOW}tail -f backend/backend.log${NC}"
echo -e "   View frontend logs: ${YELLOW}tail -f frontend/frontend.log${NC}"
echo -e "   Restart: ${YELLOW}./restart.sh${NC}"
echo ""
echo -e "${GREEN}🔥 Happy thermal inspecting with Tata Power! 🔥${NC}"