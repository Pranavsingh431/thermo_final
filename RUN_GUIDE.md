# 🚀 Thermal Eye - Quick Run Guide

## 🎯 One-Command Startup Options

### 🔥 **First Time Setup**
```bash
# Complete initial setup (one-time only)
./setup.sh
```

### 🚀 **Development Mode**
```bash
# Quick development startup
./start.sh

# Or using npm
npm start
```

### 🐳 **Docker Mode**
```bash
# Docker deployment
./start.sh --docker

# Or using npm
npm run start:docker
```

### 🏭 **Production Mode**
```bash
# Production deployment
./start.sh --production

# Or using npm
npm run start:prod
```

## 📋 **Available Commands**

### 🎬 **Startup & Control**
| Command | Description | Example |
|---------|-------------|---------|
| `./setup.sh` | Initial one-time setup | `./setup.sh` |
| `./start.sh` | Start development servers | `./start.sh` |
| `./start.sh --docker` | Start with Docker | `./start.sh --docker` |
| `./start.sh --production` | Start in production mode | `./start.sh --production` |
| `./stop.sh` | Stop all services | `./stop.sh` |
| `./restart.sh` | Restart all services | `./restart.sh --production` |

### 🧪 **Testing**
| Command | Description | Example |
|---------|-------------|---------|
| `./dev.sh test` | Run all tests | `./dev.sh test` |
| `./dev.sh test-be` | Backend tests only | `./dev.sh test-be` |
| `./dev.sh test-fe` | Frontend tests only | `./dev.sh test-fe` |
| `./dev.sh coverage` | Tests with coverage | `./dev.sh coverage` |

### 🔍 **Code Quality**
| Command | Description | Example |
|---------|-------------|---------|
| `./dev.sh lint` | Run all linters | `./dev.sh lint` |
| `./dev.sh lint-be` | Backend linting | `./dev.sh lint-be` |
| `./dev.sh lint-fe` | Frontend linting | `./dev.sh lint-fe` |
| `./dev.sh format` | Format all code | `./dev.sh format` |

### 🗄️ **Database**
| Command | Description | Example |
|---------|-------------|---------|
| `./dev.sh db-migrate` | Run migrations | `./dev.sh db-migrate` |
| `./dev.sh db-reset` | Reset database | `./dev.sh db-reset` |
| `./dev.sh db-seed` | Add demo data | `./dev.sh db-seed` |

### 📊 **Monitoring**
| Command | Description | Example |
|---------|-------------|---------|
| `./dev.sh status` | Check service status | `./dev.sh status` |
| `./dev.sh health` | Health check | `./dev.sh health` |
| `./dev.sh logs` | View logs | `./dev.sh logs` |

### 🏭 **Production Deployment**
| Command | Description | Example |
|---------|-------------|---------|
| `./deploy.sh` | Full production deploy | `./deploy.sh` |
| `./deploy.sh --manual` | Manual deployment | `./deploy.sh --manual` |
| `./deploy.sh --skip-tests` | Fast deployment | `./deploy.sh --skip-tests` |

## 🎯 **Quick Start Scenarios**

### 👨‍💻 **Developer Starting Work**
```bash
# 1. First time setup (if needed)
./setup.sh

# 2. Start development environment  
./start.sh

# 3. Run tests to verify everything works
./dev.sh test

# Access: http://localhost:3000
```

### 🏭 **Production Deployment**
```bash
# 1. Setup environment file with production API keys
cp ENV.sample .env
# Edit .env with real values

# 2. Deploy to production
./deploy.sh

# 3. Verify deployment
./dev.sh health

# Access: http://your-domain.com
```

### 🐳 **Docker Deployment**
```bash
# 1. Ensure Docker is running
docker --version

# 2. Start with Docker
./start.sh --docker

# 3. Check status
docker-compose ps

# Access: http://localhost:3000
```

### 🧪 **Testing & QA**
```bash
# 1. Run full test suite
./dev.sh test

# 2. Check code quality
./dev.sh lint

# 3. Generate coverage reports
./dev.sh coverage

# 4. View results in browser
open backend/htmlcov/index.html
open frontend/coverage/lcov-report/index.html
```

## 📱 **Access URLs**

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application interface |
| **Backend API** | http://localhost:8000 | REST API endpoints |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **Health Check** | http://localhost:8000/health | Service health endpoint |

## 🔑 **Default Credentials**

| User Type | Email | Password |
|-----------|-------|----------|
| **Admin** | admin@example.com | admin123 |

> ⚠️ **Security**: Change default password in production!

## 🛠️ **Troubleshooting**

### ❌ **Services Won't Start**
```bash
# Check what's running
./dev.sh status

# View logs
./dev.sh logs

# Stop everything and restart
./stop.sh
./start.sh
```

### 🐛 **Database Issues**
```bash
# Reset database
./dev.sh db-reset

# Seed with demo data
./dev.sh db-seed
```

### 🔍 **Port Conflicts**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000

# Kill conflicting processes
./stop.sh
```

### 🐳 **Docker Issues**
```bash
# Stop containers
docker-compose down

# Clean up
docker system prune

# Rebuild and start
./start.sh --docker
```

## 📚 **NPM Scripts (Alternative)**

All commands are also available as npm scripts:

```bash
npm run setup           # ./setup.sh
npm start              # ./start.sh  
npm run start:docker   # ./start.sh --docker
npm run start:prod     # ./start.sh --production
npm stop               # ./stop.sh
npm test               # ./dev.sh test
npm run lint           # ./dev.sh lint
npm run deploy         # ./deploy.sh
```

## 🔧 **Environment Configuration**

Edit `.env` file for your configuration:

```env
# Required API Keys
OPENROUTER_API_KEY=your-openrouter-api-key
OPENWEATHER_API_KEY=your-openweather-api-key

# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Database (SQLite default, PostgreSQL for production)
DATABASE_URL=sqlite:///./thermal_eye.db

# Security
SECRET_KEY=your-super-secret-key-change-in-production
```

## 🎉 **Success Indicators**

✅ **Development Ready When:**
- Frontend loads at http://localhost:3000
- Backend API responds at http://localhost:8000/health
- Can login with admin@example.com / admin123
- All tests pass: `./dev.sh test`

✅ **Production Ready When:**
- Health checks pass: `./dev.sh health`
- All services show "healthy" status
- SSL certificates configured
- Monitoring and backups set up

---

**🔥 Happy thermal inspecting with Tata Power! 🔥**

For detailed documentation, see:
- [README.md](README.md) - Complete project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
