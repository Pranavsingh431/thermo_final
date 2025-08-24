# Thermal Eye Production Setup Guide

This guide covers the complete setup process for deploying Thermal Eye in a production environment.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose
- PostgreSQL 13+
- Node.js 18+
- Python 3.9+
- Nginx (for reverse proxy)

## Environment Configuration

1. **Copy environment template:**
   ```bash
   cp ENV.sample .env
   ```

2. **Update .env with production values:**
   ```bash
   # Authentication
   SECRET_KEY=your-production-secret-key-256-bits-minimum
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   FRONTEND_URL=https://your-domain.com
   
   # Database
   DATABASE_URL=postgresql://thermal_user:secure_password@localhost:5432/thermaleye
   
   # API Keys
   WEATHER_API_KEY=your_openweathermap_key
   OPENROUTER_API_KEY=your_openrouter_key
   
   # SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@company.com
   SMTP_PASSWORD=your_app_password
   
   # Monitoring
   SENTRY_DSN=your_sentry_dsn_optional
   ENVIRONMENT=production
   
   # Email alerts
   ALERT_EMAIL_RECIPIENT=alerts@company.com
   ```

## Database Setup

1. **Install PostgreSQL:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create database and user:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE thermaleye;
   CREATE USER thermal_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE thermaleye TO thermal_user;
   \q
   ```

3. **Run migrations:**
   ```bash
   ./scripts/run_migrations.sh
   ```

## Production Deployment

### Option 1: Docker Deployment (Recommended)

1. **Build and start services:**
   ```bash
   ./deploy.sh --production
   ```

2. **Verify deployment:**
   ```bash
   docker-compose ps
   curl http://localhost:8000/health
   ```

### Option 2: Manual Deployment

1. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Run migrations
   cd app
   alembic upgrade head
   cd ..
   
   # Start backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

2. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   npm run build
   
   # Serve with nginx or static server
   npx serve -s build -l 3000
   ```

## Nginx Configuration

1. **Create nginx config:**
   ```bash
   sudo cp nginx/thermal-eye.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/thermal-eye.conf /etc/nginx/sites-enabled/
   ```

2. **Update domain in config:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Enable and restart nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## SSL/TLS Setup

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Monitoring Setup

1. **Start monitoring services:**
   ```bash
   docker-compose --profile monitoring up -d
   ```

2. **Access monitoring:**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)

## Backup Configuration

1. **Setup automated backups:**
   ```bash
   chmod +x scripts/backup_db.sh
   
   # Add to crontab
   crontab -e
   # Add: 0 2 * * * /path/to/thermal_eye/scripts/backup_db.sh
   ```

2. **Manual backup:**
   ```bash
   ./scripts/backup_db.sh
   ```

## Security Checklist

- [ ] Change default admin password
- [ ] Configure firewall (UFW)
- [ ] Setup SSL/TLS certificates
- [ ] Configure Sentry for error tracking
- [ ] Setup log rotation
- [ ] Configure backup retention
- [ ] Review user permissions
- [ ] Enable audit logging

## Maintenance

### Regular Tasks

1. **Update dependencies:**
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt --upgrade
   
   # Frontend
   cd frontend && npm update
   ```

2. **Database maintenance:**
   ```bash
   # Backup before maintenance
   ./scripts/backup_db.sh
   
   # Vacuum and analyze (PostgreSQL)
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

3. **Log rotation:**
   ```bash
   # Setup logrotate for application logs
   sudo cp config/logrotate.conf /etc/logrotate.d/thermal-eye
   ```

### Troubleshooting

1. **Check service status:**
   ```bash
   # Docker
   docker-compose ps
   docker-compose logs backend
   docker-compose logs frontend
   
   # Manual
   systemctl status thermal-eye-backend
   systemctl status thermal-eye-frontend
   ```

2. **Database connectivity:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

3. **API health check:**
   ```bash
   curl http://localhost:8000/health
   ```

## Performance Optimization

1. **Database optimization:**
   - Configure PostgreSQL connection pooling
   - Set appropriate work_mem and shared_buffers
   - Enable query logging for slow queries

2. **Application optimization:**
   - Use Redis for caching (optional)
   - Configure CDN for static assets
   - Enable gzip compression in nginx

3. **Monitoring:**
   - Set up alerts for high CPU/memory usage
   - Monitor disk space for uploads and backups
   - Track API response times

## Support

For issues and support:
- Check logs: `docker-compose logs` or application log files
- Review monitoring dashboards
- Check database connectivity and migrations
- Verify environment variables and configuration

## Security Updates

Regularly update:
- Operating system packages
- Python dependencies
- Node.js dependencies
- Docker images
- SSL certificates
