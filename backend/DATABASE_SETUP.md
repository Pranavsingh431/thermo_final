# Database Setup for Thermal Eye

## Overview

Thermal Eye uses SQLite by default for development and can easily switch to PostgreSQL for production using environment variables.

## Database Migrations with Alembic

### Development Setup

1. **Default SQLite (no setup required)**:
   ```bash
   # Uses sqlite:///./thermal_eye.db by default
   python -m uvicorn app.main:app --reload
   ```

2. **Running migrations**:
   ```bash
   cd app
   alembic upgrade head
   ```

### Production Setup (PostgreSQL)

1. **Install PostgreSQL dependencies**:
   ```bash
   pip install psycopg2-binary
   ```

2. **Set environment variable**:
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/thermal_eye_db"
   ```

3. **Run migrations**:
   ```bash
   cd app
   alembic upgrade head
   ```

## Creating New Migrations

When you modify models in `app/models.py`:

```bash
cd app
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Database Schema

### Tables

- **thermal_reports**: Stores thermal inspection data and analysis results
- **users**: Stores user authentication and role information

### Supported Databases

- **SQLite**: Default for development (no setup required)
- **PostgreSQL**: Recommended for production
- **Other databases**: Supported through SQLAlchemy (MySQL, etc.)

## Environment Variables

```bash
# Development (default)
DATABASE_URL=sqlite:///./thermal_eye.db

# Production
DATABASE_URL=postgresql://thermal_user:thermal_pass@localhost:5432/thermal_eye_db
```

## Migration Commands Reference

```bash
# Check current migration status
alembic current

# Show migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# Generate new migration
alembic revision --autogenerate -m "description"
```
