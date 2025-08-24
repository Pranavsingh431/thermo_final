#!/bin/bash

# 🔥 Thermal Eye - Development Script
# Development tools and utilities for Thermal Eye

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${PURPLE}"
cat << "EOF"
 ____                 _                                  _   
|  _ \  _____   __   | |_ ___   ___  | |___
| | | |/ _ \ \ / /   | __/ _ \ / _ \ | / __|
| |_| |  __/\ V /    | || (_) | (_) || \__ \
|____/ \___| \_/      \__\___/ \___/ |_|___/
EOF
echo -e "${NC}"
echo -e "${GREEN}🔥 Thermal Eye Development Tools${NC}"
echo -e "${BLUE}===============================${NC}"
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
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}Available commands:${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Deployment:${NC}"
    echo -e "  ${CYAN}start${NC}      Start development servers"
    echo -e "  ${CYAN}stop${NC}       Stop all services"
    echo -e "  ${CYAN}restart${NC}    Restart all services"
    echo -e "  ${CYAN}docker${NC}     Start with Docker"
    echo ""
    echo -e "${YELLOW}🧪 Testing:${NC}"
    echo -e "  ${CYAN}test${NC}       Run all tests"
    echo -e "  ${CYAN}test-be${NC}    Run backend tests only"
    echo -e "  ${CYAN}test-fe${NC}    Run frontend tests only"
    echo -e "  ${CYAN}coverage${NC}   Run tests with coverage"
    echo ""
    echo -e "${YELLOW}🔍 Code Quality:${NC}"
    echo -e "  ${CYAN}lint${NC}       Run all linters"
    echo -e "  ${CYAN}lint-be${NC}    Run backend linting (flake8)"
    echo -e "  ${CYAN}lint-fe${NC}    Run frontend linting (ESLint)"
    echo -e "  ${CYAN}format${NC}     Format all code"
    echo ""
    echo -e "${YELLOW}🗄️  Database:${NC}"
    echo -e "  ${CYAN}db-migrate${NC} Run database migrations"
    echo -e "  ${CYAN}db-reset${NC}   Reset database"
    echo -e "  ${CYAN}db-seed${NC}    Seed database with test data"
    echo ""
    echo -e "${YELLOW}📦 Dependencies:${NC}"
    echo -e "  ${CYAN}install${NC}    Install all dependencies"
    echo -e "  ${CYAN}update${NC}     Update dependencies"
    echo -e "  ${CYAN}clean${NC}      Clean build artifacts"
    echo ""
    echo -e "${YELLOW}📊 Monitoring:${NC}"
    echo -e "  ${CYAN}logs${NC}       View logs"
    echo -e "  ${CYAN}status${NC}     Check service status"
    echo -e "  ${CYAN}health${NC}     Health check"
    echo ""
    echo -e "${YELLOW}🔧 Utilities:${NC}"
    echo -e "  ${CYAN}env${NC}        Setup environment file"
    echo -e "  ${CYAN}demo${NC}       Create demo data"
    echo -e "  ${CYAN}backup${NC}     Backup database"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  ${YELLOW}./dev.sh start${NC}      # Start development servers"
    echo -e "  ${YELLOW}./dev.sh test${NC}       # Run all tests"
    echo -e "  ${YELLOW}./dev.sh lint${NC}       # Run all linters"
    echo ""
}

# Check prerequisites
check_prereqs() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    if ! command -v python3 >/dev/null 2>&1; then
        print_error "Python 3.9+ is required"
        exit 1
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js 18+ is required"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Install dependencies
install_deps() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Backend dependencies
    echo -e "${BLUE}🐍 Installing backend dependencies...${NC}"
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    cd ..
    print_status "Backend dependencies installed"
    
    # Frontend dependencies
    echo -e "${BLUE}⚛️  Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    print_status "Frontend dependencies installed"
}

# Run tests
run_tests() {
    case $1 in
        "backend"|"be")
            echo -e "${BLUE}🧪 Running backend tests...${NC}"
            cd backend
            source venv/bin/activate
            python -m pytest -v
            cd ..
            ;;
        "frontend"|"fe")
            echo -e "${BLUE}🧪 Running frontend tests...${NC}"
            cd frontend
            npm test -- --watchAll=false --testTimeout=10000
            cd ..
            ;;
        "coverage")
            echo -e "${BLUE}🧪 Running tests with coverage...${NC}"
            cd backend
            source venv/bin/activate
            python -m pytest --cov=app --cov-report=html --cov-report=term
            cd ..
            
            cd frontend
            npm test -- --coverage --watchAll=false --testTimeout=10000
            cd ..
            print_info "Coverage reports generated:"
            print_info "  Backend: backend/htmlcov/index.html"
            print_info "  Frontend: frontend/coverage/lcov-report/index.html"
            ;;
        *)
            echo -e "${BLUE}🧪 Running all tests...${NC}"
            
            echo -e "${BLUE}🐍 Backend tests...${NC}"
            cd backend
            source venv/bin/activate
            python -m pytest -v
            cd ..
            
            echo -e "${BLUE}⚛️  Frontend tests...${NC}"
            cd frontend
            npm test -- --watchAll=false --testTimeout=10000
            cd ..
            ;;
    esac
    print_status "Tests completed"
}

# Run linting
run_lint() {
    case $1 in
        "backend"|"be")
            echo -e "${BLUE}🔍 Running backend linting...${NC}"
            cd backend
            source venv/bin/activate
            flake8 app --count --select=E9,F63,F7,F82 --show-source --statistics
            flake8 app --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
            cd ..
            ;;
        "frontend"|"fe")
            echo -e "${BLUE}🔍 Running frontend linting...${NC}"
            cd frontend
            npm run lint
            cd ..
            ;;
        *)
            echo -e "${BLUE}🔍 Running all linting...${NC}"
            
            echo -e "${BLUE}🐍 Backend linting...${NC}"
            cd backend
            source venv/bin/activate
            flake8 app --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
            cd ..
            
            echo -e "${BLUE}⚛️  Frontend linting...${NC}"
            cd frontend
            npm run lint
            cd ..
            ;;
    esac
    print_status "Linting completed"
}

# Format code
format_code() {
    echo -e "${BLUE}🎨 Formatting code...${NC}"
    
    echo -e "${BLUE}🐍 Formatting backend code...${NC}"
    cd backend
    source venv/bin/activate
    if command -v black >/dev/null 2>&1; then
        black app/
    else
        print_warning "Black not installed, skipping Python formatting"
    fi
    cd ..
    
    echo -e "${BLUE}⚛️  Formatting frontend code...${NC}"
    cd frontend
    if npm list prettier >/dev/null 2>&1; then
        npx prettier --write src/
    else
        print_warning "Prettier not installed, skipping JavaScript formatting"
    fi
    cd ..
    
    print_status "Code formatting completed"
}

# Database operations
db_operations() {
    case $1 in
        "migrate")
            echo -e "${BLUE}🗄️  Running database migrations...${NC}"
            cd backend/app
            source ../venv/bin/activate
            alembic upgrade head
            cd ../..
            print_status "Database migrations completed"
            ;;
        "reset")
            echo -e "${BLUE}🗄️  Resetting database...${NC}"
            rm -f backend/thermal_eye.db backend/app/thermal_eye.db
            cd backend/app
            source ../venv/bin/activate
            alembic upgrade head
            cd ../..
            print_status "Database reset completed"
            ;;
        "seed")
            echo -e "${BLUE}🗄️  Seeding database...${NC}"
            print_info "Creating demo admin user..."
            cd backend
            source venv/bin/activate
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

# Create tables
Base.metadata.create_all(bind=engine)

# Add demo user
db = SessionLocal()
try:
    # Check if admin exists
    admin = db.query(User).filter(User.email == 'admin@thermal.local').first()
    if not admin:
        admin = User(
            email='admin@thermal.local',
            hashed_password=get_password_hash('admin123'),
            role='admin'
        )
        db.add(admin)
        db.commit()
        print('✅ Demo admin user created: admin@thermal.local / admin123')
    else:
        print('ℹ️  Demo admin user already exists')
finally:
    db.close()
"
            cd ..
            print_status "Database seeded with demo data"
            ;;
    esac
}

# View logs
view_logs() {
    echo -e "${BLUE}📋 Available logs:${NC}"
    
    if [ -f "backend/backend.log" ]; then
        echo -e "${CYAN}Backend logs:${NC}"
        tail -n 20 backend/backend.log
        echo ""
    fi
    
    if [ -f "frontend/frontend.log" ]; then
        echo -e "${CYAN}Frontend logs:${NC}"
        tail -n 20 frontend/frontend.log
        echo ""
    fi
    
    # Docker logs
    if [ "$(docker-compose ps -q)" ]; then
        echo -e "${CYAN}Docker logs:${NC}"
        docker-compose logs --tail=20
    fi
}

# Check status
check_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    
    # Check Docker
    if [ "$(docker-compose ps -q)" ]; then
        echo -e "${CYAN}Docker Services:${NC}"
        docker-compose ps
        echo ""
    fi
    
    # Check manual processes
    if [ -f "backend/backend.pid" ]; then
        BACKEND_PID=$(cat backend/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend running (PID: $BACKEND_PID)${NC}"
        else
            echo -e "${RED}❌ Backend not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Backend PID file not found${NC}"
    fi
    
    if [ -f "frontend/frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend running (PID: $FRONTEND_PID)${NC}"
        else
            echo -e "${RED}❌ Frontend not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Frontend PID file not found${NC}"
    fi
}

# Health check
health_check() {
    echo -e "${BLUE}🏥 Health Check:${NC}"
    
    # Backend health
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend healthy${NC}"
    else
        echo -e "${RED}❌ Backend unhealthy${NC}"
    fi
    
    # Frontend health
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend healthy${NC}"
    else
        echo -e "${RED}❌ Frontend unhealthy${NC}"
    fi
}

# Setup environment
setup_env() {
    if [ ! -f ".env" ]; then
        if [ -f "ENV.sample" ]; then
            cp ENV.sample .env
            print_status "Environment file created from template"
            print_info "Please edit .env file with your API keys"
        else
            print_error "ENV.sample template not found"
        fi
    else
        print_warning ".env file already exists"
    fi
}

# Clean build artifacts
clean_build() {
    echo -e "${BLUE}🧹 Cleaning build artifacts...${NC}"
    
    # Backend
    find backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find backend -name "*.pyc" -delete 2>/dev/null || true
    rm -rf backend/htmlcov 2>/dev/null || true
    
    # Frontend
    rm -rf frontend/build 2>/dev/null || true
    rm -rf frontend/coverage 2>/dev/null || true
    
    # Logs
    rm -f backend/backend.log frontend/frontend.log 2>/dev/null || true
    
    print_status "Build artifacts cleaned"
}

# Backup database
backup_db() {
    echo -e "${BLUE}💾 Backing up database...${NC}"
    
    BACKUP_DIR="backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    if [ -f "backend/thermal_eye.db" ]; then
        cp backend/thermal_eye.db $BACKUP_DIR/thermal_eye_$TIMESTAMP.db
        print_status "Database backed up to $BACKUP_DIR/thermal_eye_$TIMESTAMP.db"
    else
        print_warning "Database file not found"
    fi
}

# Main command handling
case $1 in
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    "start")
        check_prereqs
        ./start.sh
        ;;
    "stop")
        ./stop.sh
        ;;
    "restart")
        ./restart.sh
        ;;
    "docker")
        check_prereqs
        ./start.sh --docker
        ;;
    "test")
        run_tests $2
        ;;
    "test-be")
        run_tests "backend"
        ;;
    "test-fe")
        run_tests "frontend"
        ;;
    "coverage")
        run_tests "coverage"
        ;;
    "lint")
        run_lint $2
        ;;
    "lint-be")
        run_lint "backend"
        ;;
    "lint-fe")
        run_lint "frontend"
        ;;
    "format")
        format_code
        ;;
    "db-migrate")
        db_operations "migrate"
        ;;
    "db-reset")
        db_operations "reset"
        ;;
    "db-seed")
        db_operations "seed"
        ;;
    "install")
        install_deps
        ;;
    "clean")
        clean_build
        ;;
    "logs")
        view_logs
        ;;
    "status")
        check_status
        ;;
    "health")
        health_check
        ;;
    "env")
        setup_env
        ;;
    "backup")
        backup_db
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
