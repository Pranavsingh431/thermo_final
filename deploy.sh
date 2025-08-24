#!/bin/bash

# 🔥 Thermal Eye - Production Deployment Script
# Automated production deployment for Thermal Eye

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
 _____            _            _   _             
|  __ \          | |          | | (_)            
| |  | | ___ _ __ | | ___  ___ | |_ _  ___  _ __  
| |  | |/ _ \ '_ \| |/ _ \/ _ \| __| |/ _ \| '_ \ 
| |__| |  __/ |_) | | (_) | (_) | |_| | (_) | | | |
|_____/ \___| .__/|_|\___/ \___/ \__|_|\___/|_| |_|
            | |                                   
            |_|                                   
EOF
echo -e "${NC}"
echo -e "${GREEN}🔥 Thermal Eye Production Deployment${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Default values
DEPLOYMENT_TYPE="docker"
SKIP_TESTS=false
BACKUP_DB=true
UPDATE_DEPS=false
NGINX_SETUP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --manual)
            DEPLOYMENT_TYPE="manual"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-backup)
            BACKUP_DB=false
            shift
            ;;
        --update-deps)
            UPDATE_DEPS=true
            shift
            ;;
        --setup-nginx)
            NGINX_SETUP=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --manual         Use manual deployment instead of Docker"
            echo "  --skip-tests     Skip running tests before deployment"
            echo "  --no-backup      Skip database backup"
            echo "  --update-deps    Update dependencies before deployment"
            echo "  --setup-nginx    Setup Nginx configuration"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Docker deployment with tests"
            echo "  $0 --manual            # Manual deployment"
            echo "  $0 --skip-tests        # Fast deployment without tests"
            echo "  $0 --setup-nginx       # Setup with Nginx reverse proxy"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

echo -e "${BLUE}🎯 Deployment Configuration:${NC}"
echo -e "   Type: ${YELLOW}$DEPLOYMENT_TYPE${NC}"
echo -e "   Skip Tests: ${YELLOW}$SKIP_TESTS${NC}"
echo -e "   Backup DB: ${YELLOW}$BACKUP_DB${NC}"
echo -e "   Update Dependencies: ${YELLOW}$UPDATE_DEPS${NC}"
echo -e "   Setup Nginx: ${YELLOW}$NGINX_SETUP${NC}"
echo ""

# Pre-deployment checks
echo -e "${BLUE}🔍 Pre-deployment checks...${NC}"

# Check if .env exists and has required variables
if [ ! -f ".env" ]; then
    print_error ".env file not found"
    echo "Please create .env file with production configuration"
    exit 1
fi

# Check for required environment variables
REQUIRED_VARS=("SECRET_KEY" "OPENROUTER_API_KEY" "OPENWEATHER_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
        print_error "Required environment variable $var not found in .env"
        exit 1
    fi
done
print_status "Environment configuration validated"

# Check deployment type prerequisites
if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is required for Docker deployment"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "Docker Compose is required for Docker deployment"
        exit 1
    fi
    print_status "Docker prerequisites satisfied"
else
    if ! command -v python3 >/dev/null 2>&1; then
        print_error "Python 3.9+ is required for manual deployment"
        exit 1
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js 18+ is required for manual deployment"
        exit 1
    fi
    print_status "Manual deployment prerequisites satisfied"
fi

# Backup database
if [ "$BACKUP_DB" = true ]; then
    echo -e "${BLUE}💾 Creating database backup...${NC}"
    mkdir -p backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    if [ -f "backend/thermal_eye.db" ]; then
        cp backend/thermal_eye.db backups/thermal_eye_pre_deploy_$TIMESTAMP.db
        print_status "Database backed up to backups/thermal_eye_pre_deploy_$TIMESTAMP.db"
    else
        print_warning "No existing database found to backup"
    fi
fi

# Update dependencies
if [ "$UPDATE_DEPS" = true ]; then
    echo -e "${BLUE}📦 Updating dependencies...${NC}"
    
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        print_info "Dependencies will be updated during Docker build"
    else
        # Update backend dependencies
        cd backend
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        cd ..
        
        # Update frontend dependencies
        cd frontend
        npm update
        cd ..
        print_status "Dependencies updated"
    fi
fi

# Run tests
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}🧪 Running tests before deployment...${NC}"
    
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        # Quick test with current environment
        print_info "Running quick tests..."
        
        # Backend tests
        cd backend
        if [ -d "venv" ]; then
            source venv/bin/activate
            python -m pytest --tb=short -x
        else
            print_warning "No virtual environment found, skipping backend tests"
        fi
        cd ..
        
        # Frontend tests
        cd frontend
        if [ -f "package.json" ]; then
            npm test -- --watchAll=false --testTimeout=10000
        else
            print_warning "No package.json found, skipping frontend tests"
        fi
        cd ..
    else
        ./dev.sh test
    fi
    
    print_status "All tests passed"
fi

# Stop existing services
echo -e "${BLUE}🛑 Stopping existing services...${NC}"
if [ -f "stop.sh" ]; then
    ./stop.sh
else
    print_warning "No stop script found, manually stopping services..."
    pkill -f "uvicorn.*app.main:app" || true
    pkill -f "npm.*start" || true
    pkill -f "serve.*build" || true
fi

# Deploy based on type
if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    echo -e "${BLUE}🐳 Docker Production Deployment...${NC}"
    
    # Build and start production containers
    print_info "Building production containers..."
    docker-compose --profile production build
    
    print_info "Starting production services..."
    docker-compose --profile production up -d
    
    # Wait for services to start
    print_info "Waiting for services to start..."
    sleep 15
    
    # Health checks
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Check backend
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            print_status "Backend is healthy"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            print_error "Backend health check failed after $MAX_RETRIES attempts"
            docker-compose logs backend
            exit 1
        fi
    done
    
    # Check frontend
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_status "Frontend is healthy"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            print_error "Frontend health check failed after $MAX_RETRIES attempts"
            docker-compose logs frontend
            exit 1
        fi
    done
    
else
    echo -e "${BLUE}🛠️  Manual Production Deployment...${NC}"
    
    # Backend deployment
    echo -e "${BLUE}🐍 Deploying backend...${NC}"
    cd backend
    source venv/bin/activate
    
    # Run database migrations
    if [ -f "app/alembic.ini" ]; then
        cd app
        alembic upgrade head
        cd ..
        print_status "Database migrations applied"
    fi
    
    # Start backend in production mode
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    print_status "Backend started in production mode (PID: $BACKEND_PID)"
    cd ..
    
    # Frontend deployment
    echo -e "${BLUE}⚛️  Deploying frontend...${NC}"
    cd frontend
    
    # Build for production
    print_info "Building frontend for production..."
    npm run build
    
    # Install serve if not present
    if ! command -v serve >/dev/null 2>&1; then
        npm install -g serve
    fi
    
    # Start frontend
    nohup serve -s build -l 3000 > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    print_status "Frontend started in production mode (PID: $FRONTEND_PID)"
    cd ..
    
    # Wait and health check
    print_info "Waiting for services to start..."
    sleep 10
    
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        cat backend/backend.log
        exit 1
    fi
    
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        cat frontend/frontend.log
        exit 1
    fi
fi

# Setup Nginx if requested
if [ "$NGINX_SETUP" = true ]; then
    echo -e "${BLUE}🌐 Setting up Nginx...${NC}"
    
    # Create Nginx configuration
    mkdir -p nginx
    cat > nginx/thermal-eye.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
EOF
    
    print_status "Nginx configuration created at nginx/thermal-eye.conf"
    print_info "To enable:"
    print_info "  sudo cp nginx/thermal-eye.conf /etc/nginx/sites-available/"
    print_info "  sudo ln -s /etc/nginx/sites-available/thermal-eye.conf /etc/nginx/sites-enabled/"
    print_info "  sudo nginx -t && sudo systemctl reload nginx"
fi

# Final deployment summary
echo ""
echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "   Type: ${YELLOW}$DEPLOYMENT_TYPE${NC}"
echo -e "   Timestamp: ${YELLOW}$(date)${NC}"
if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    echo -e "   Services: ${YELLOW}$(docker-compose ps --services | tr '\n' ' ')${NC}"
else
    echo -e "   Backend PID: ${YELLOW}$(cat backend/backend.pid 2>/dev/null || echo 'Unknown')${NC}"
    echo -e "   Frontend PID: ${YELLOW}$(cat frontend/frontend.pid 2>/dev/null || echo 'Unknown')${NC}"
fi
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "   API Documentation: ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}📋 Management Commands:${NC}"
if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    echo -e "   View logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "   Stop services: ${YELLOW}docker-compose down${NC}"
    echo -e "   Restart: ${YELLOW}docker-compose restart${NC}"
else
    echo -e "   View logs: ${YELLOW}tail -f backend/backend.log frontend/frontend.log${NC}"
    echo -e "   Stop services: ${YELLOW}./stop.sh${NC}"
    echo -e "   Restart: ${YELLOW}./restart.sh --production${NC}"
fi
echo ""
echo -e "${BLUE}🔐 Security Reminders:${NC}"
echo -e "   ⚠️  Change default admin password"
echo -e "   ⚠️  Setup SSL/TLS certificates"
echo -e "   ⚠️  Configure firewall rules"
echo -e "   ⚠️  Setup monitoring and backups"
echo ""
echo -e "${GREEN}🔥 Thermal Eye is now running in production mode! 🔥${NC}"
