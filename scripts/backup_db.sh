#!/bin/bash


set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"thermal_eye_backup_$TIMESTAMP"}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

mkdir -p "$BACKUP_DIR"

if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in environment"
    exit 1
fi

echo "🔄 Starting database backup..."

if [[ $DATABASE_URL == sqlite* ]]; then
    DB_FILE=$(echo $DATABASE_URL | sed 's/sqlite:\/\/\///')
    if [ -f "$DB_FILE" ]; then
        cp "$DB_FILE" "$BACKUP_DIR/${BACKUP_NAME}.db"
        print_status "SQLite database backed up to $BACKUP_DIR/${BACKUP_NAME}.db"
    else
        print_error "SQLite database file not found: $DB_FILE"
        exit 1
    fi
elif [[ $DATABASE_URL == postgresql* ]]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/${BACKUP_NAME}.sql"
    print_status "PostgreSQL database backed up to $BACKUP_DIR/${BACKUP_NAME}.sql"
else
    print_error "Unsupported database type in DATABASE_URL"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.*"
if [ -f "$BACKUP_DIR/${BACKUP_NAME}.sql" ] && [ $(stat -f%z "$BACKUP_DIR/${BACKUP_NAME}.sql" 2>/dev/null || stat -c%s "$BACKUP_DIR/${BACKUP_NAME}.sql") -gt 10485760 ]; then
    gzip "$BACKUP_DIR/${BACKUP_NAME}.sql"
    print_status "Backup compressed to ${BACKUP_NAME}.sql.gz"
fi

cd "$BACKUP_DIR"
ls -t thermal_eye_backup_* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
cd ..

print_status "Database backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR/${BACKUP_NAME}.*"
echo "🗂️ Total backups in directory: $(ls -1 $BACKUP_DIR/thermal_eye_backup_* 2>/dev/null | wc -l)"
