# 🚀 Deployment Guide

This document provides comprehensive instructions for deploying Thermal Eye in various environments.

## 📋 Prerequisites

### System Requirements
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows

### Software Dependencies
- **Docker & Docker Compose** (recommended)
- **Python 3.9+** (for manual deployment)
- **Node.js 18+** (for manual deployment)
- **PostgreSQL 13+** (for production)
- **Nginx** (for production reverse proxy)

## 🐳 Docker Deployment (Recommended)

### Quick Start
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/thermal-eye.git
cd thermal-eye

# Copy environment template
cp ENV.sample .env

# Edit environment variables
nano .env

# Start all services
docker-compose up -d
```

### Environment Configuration
Edit `.env` file with your settings:
```bash
# Database
DATABASE_URL=postgresql://thermal_user:thermal_password@db:5432/thermal_eye

# Authentication
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External APIs
OPENROUTER_API_KEY=your-openrouter-api-key
OPENWEATHER_API_KEY=your-openweather-api-key

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Production Deployment
```bash
# Use production profile
docker-compose --profile production up -d

# Check service health
docker-compose ps
docker-compose logs -f backend
```

## 🔧 Manual Deployment

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up database
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Serve with static server
npm install -g serve
serve -s build -l 3000
```

## 🌐 Production Setup

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/thermal-eye
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL Setup with Let's Encrypt
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE thermal_eye;
CREATE USER thermal_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE thermal_eye TO thermal_user;
```

## 🔐 Security Considerations

### Environment Variables
- **Never commit `.env` files** to version control
- **Use strong passwords** and API keys
- **Rotate secrets regularly**
- **Use environment-specific configurations**

### Network Security
```bash
# Firewall setup (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### File Permissions
```bash
# Set proper ownership
sudo chown -R thermal:thermal /app
sudo chmod 755 /app
sudo chmod 600 /app/.env
```

## 📊 Monitoring & Logging

### Health Checks
- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost:3000/health`
- **Database**: Check connection in logs

### Log Locations
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Monitoring Setup
```bash
# Install monitoring tools
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Create backup
docker exec thermal_eye_db_1 pg_dump -U thermal_user thermal_eye > backup.sql

# Restore backup
docker exec -i thermal_eye_db_1 psql -U thermal_user thermal_eye < backup.sql
```

### File Backup
```bash
# Backup uploads and temp files
tar -czf thermal_backup_$(date +%Y%m%d).tar.gz \
  backend/uploads \
  backend/temp_images \
  .env
```

## 🚀 Scaling Considerations

### Load Balancing
```bash
# Multiple backend instances
docker-compose up --scale backend=3
```

### Database Scaling
- **Read Replicas**: For read-heavy workloads
- **Connection Pooling**: Use pgbouncer
- **Caching**: Implement Redis caching

### CDN Setup
- **Static Assets**: Use CloudFront or similar
- **Image Storage**: Consider S3 or object storage

## 🔧 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common fixes
- Check DATABASE_URL format
- Verify API keys are set
- Ensure database is accessible
```

#### Frontend Build Fails
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues
```bash
# Test connection
docker exec thermal_eye_db_1 psql -U thermal_user -d thermal_eye -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d
```

## 📝 Maintenance

### Regular Tasks
- **Update dependencies**: Monthly security updates
- **Monitor disk space**: Clean up old logs and temp files
- **Backup verification**: Test restore procedures
- **Performance monitoring**: Check response times

### Update Procedure
```bash
# Backup current state
docker-compose down
cp -r . ../thermal_eye_backup

# Pull updates
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify health
curl http://localhost:8000/health
```

## 🆘 Support

### Getting Help
- **Documentation**: Check `/docs` folder
- **Logs**: Always include relevant logs
- **Environment**: Specify deployment method and OS
- **Version**: Include git commit hash

### Emergency Contacts
- **System Admin**: [Contact Information]
- **Development Team**: [Contact Information]
- **Tata Power POC**: [Contact Information]

---

**For production deployments, ensure all security guidelines are followed and proper testing is conducted.**
