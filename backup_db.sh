#!/usr/bin/env bash
# ==============================================================================
# Automated MariaDB Backup & Rotation Script for Nuts & Nutrition
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${HOME}/nutsandnutrition_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nuts_db_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="nutsandnutrition-db"
DB_NAME="nutsandnutrition"
DB_USER="nuts_user"
DB_PASS="NutsLive2026!"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📦 Starting automated database backup for '${DB_NAME}'..."

# Verify database container is running
if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Error: Container '${CONTAINER_NAME}' is not running!" >&2
    exit 1
fi

# Execute compressed mysqldump via docker exec
docker exec "${CONTAINER_NAME}" mariadb-dump \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Verify file was created and is non-empty
if [ -s "${BACKUP_FILE}" ]; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Error: Backup file is empty or missing!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Rotate backups older than retention threshold
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "nuts_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🎯 Automated backup procedure completed successfully."
