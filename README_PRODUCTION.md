# Thermal Eye Production Deployment Guide

## Overview

This guide covers the complete production deployment of the Thermal Eye system with enterprise-grade security, monitoring, and infrastructure.

## Production Hardening Completed

### ✅ Authentication & Security
- **JWT Refresh Tokens**: 7-day refresh tokens with automatic rotation
- **Password Reset**: Email-based password reset with 1-hour token expiry
- **Strong Password Validation**: 8+ chars with uppercase, lowercase, numbers
- **Audit Logging**: Complete user activity tracking (login, uploads, reports)
- **Structured Logging**: JSON logging with trace IDs for debugging
- **Error Tracking**: Sentry integration for production error monitoring

### ✅ UI/UX Improvements
- **Dark Mode Consistency**: Fixed across all components and forms
- **Password Reset Flow**: Complete forgot/reset password pages
- **Settings Page**: Proper dark mode styling for all inputs and selects
- **Navigation**: Added forgot password link to login page

### ✅ Infrastructure & Monitoring
- **PostgreSQL Production DB**: Migration scripts and backup automation
- **Database Backups**: Automated daily backups with retention policy
- **Health Checks**: `/health` endpoint for monitoring
- **Monitoring Setup**: Prometheus + Grafana configuration
- **Malware Scanning**: ClamAV integration with fallback validation

### ✅ Production Configuration
- **Environment Variables**: Complete `.env.sample` with all required keys
- **Docker Setup**: Production-ready containers with PostgreSQL
- **Backup Scripts**: Automated database backup with compression
- **Migration Scripts**: Alembic migrations for audit logs and password reset

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp ENV.sample .env

# Update with production values
nano .env
```

### 2. Database Setup
```bash
# Run migrations
./scripts/run_migrations.sh

# Setup automated backups
chmod +x scripts/backup_db.sh
crontab -e
# Add: 0 2 * * * /path/to/thermal_eye/scripts/backup_db.sh
```

### 3. Production Deployment
```bash
# Start all services
docker-compose up -d

# Start with monitoring
docker-compose --profile monitoring up -d
```

### 4. Monitoring Access
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Health Check**: http://localhost:8000/health

## Security Features

### Authentication Flow
1. **Login**: Returns access + refresh tokens
2. **Token Refresh**: Automatic token rotation
3. **Password Reset**: Secure email-based reset
4. **Audit Logging**: All user actions tracked

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number

### Security Headers
- Structured logging with trace IDs
- Error tracking with Sentry
- Malware scanning for uploads
- Rate limiting on all endpoints

## API Endpoints

### New Authentication Endpoints
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

### Monitoring Endpoints
- `GET /health` - Health check for monitoring
- `GET /metrics` - Prometheus metrics (if enabled)

## Database Schema Updates

### New Tables
- **audit_logs**: User activity tracking
- **users**: Added reset_token and reset_token_expires fields

### Migration Commands
```bash
# Run latest migrations
cd backend/app
alembic upgrade head

# Check current version
alembic current
```

## Backup & Recovery

### Automated Backups
```bash
# Manual backup
./scripts/backup_db.sh

# Restore from backup
psql $DATABASE_URL < backups/thermal_eye_backup_YYYYMMDD_HHMMSS.sql
```

### Backup Configuration
- **Retention**: 10 most recent backups
- **Schedule**: Daily at 2 AM (configurable)
- **Compression**: Automatic for files > 10MB
- **Location**: `backups/` directory

## Monitoring & Alerting

### Prometheus Metrics
- HTTP request rates and latencies
- Error rates by endpoint
- Database connection pool status
- Upload processing times

### Grafana Dashboards
- System overview dashboard
- API performance metrics
- Error tracking and alerting
- User activity monitoring

### Log Analysis
- Structured JSON logs with trace IDs
- Error correlation across services
- User action audit trails
- Performance bottleneck identification

## Production Checklist

### Pre-Deployment
- [ ] Update all environment variables
- [ ] Configure PostgreSQL connection
- [ ] Set up SMTP for email notifications
- [ ] Configure Sentry DSN (optional)
- [ ] Review backup retention policy

### Post-Deployment
- [ ] Verify health check endpoint
- [ ] Test authentication flows
- [ ] Confirm email notifications work
- [ ] Set up monitoring alerts
- [ ] Test backup/restore procedures

### Security Verification
- [ ] Change default admin password
- [ ] Verify password reset flow
- [ ] Test audit logging
- [ ] Confirm malware scanning
- [ ] Review error tracking

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

**Email Not Sending**
```bash
# Verify SMTP settings in .env
# Check application logs for email errors
docker-compose logs backend | grep email
```

**Authentication Issues**
```bash
# Check JWT secret key configuration
# Verify token expiration settings
# Review audit logs for failed attempts
```

### Log Locations
- **Application Logs**: `docker-compose logs backend`
- **Database Logs**: `/var/log/postgresql/`
- **Nginx Logs**: `/var/log/nginx/`
- **Backup Logs**: `backups/backup.log`

## Performance Optimization

### Database Tuning
- Connection pooling configuration
- Query optimization for large datasets
- Index optimization for audit logs
- Regular VACUUM and ANALYZE

### Application Scaling
- Horizontal scaling with load balancer
- Redis caching for session data
- CDN for static assets
- Background job processing

## Support & Maintenance

### Regular Tasks
- Monitor disk space for uploads and backups
- Review security logs and audit trails
- Update dependencies and security patches
- Performance monitoring and optimization

### Emergency Procedures
- Database recovery from backups
- Service restart procedures
- Error investigation with trace IDs
- User account recovery processes

For detailed technical documentation, see `PRODUCTION_SETUP.md`.
