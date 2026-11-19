#!/bin/bash
set -e

# ==============================================================================
# Nuts & Nutrition - VPS Safe Deployment Script
# Isolated Docker Bridge: nuts_net
# Upstream Port: 127.0.0.1:8096 (Mapped to container port 80)
# Isolated MariaDB: 127.0.0.1:3307 (Internal Docker: nutsandnutrition-db:3306)
# Completely isolated from Knotelle, Convoza, AdMafia, and host PHP-FPM
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
DOMAIN="nutsandnutrition.shop"
PORT="${PORT:-8096}"
DB_PORT="${DB_PORT:-3307}"

echo "=================================================="
echo "🚀 Starting Deployment for Nuts & Nutrition"
echo "Project Directory: $PROJECT_DIR"
echo "Target Domain:     $DOMAIN"
echo "Upstream Web Port: 127.0.0.1:$PORT"
echo "Database Port:     127.0.0.1:$DB_PORT"
echo "=================================================="

cd "$PROJECT_DIR" || exit 1

# 0. Check for Port Conflicts with other VPS sites (e.g., Knotelle, Convoza)
echo "🔍 Checking for port conflicts on VPS..."
if ss -tulnp 2>/dev/null | grep -q ":${PORT} "; then
    EXISTING_PROC=$(ss -tulnp 2>/dev/null | grep ":${PORT} " || true)
    if ! docker ps --filter "name=nutsandnutrition-app" --format '{{.Ports}}' 2>/dev/null | grep -q "${PORT}"; then
        echo "⚠️  WARNING: Port ${PORT} is currently in use by another service on this VPS:"
        echo "   $EXISTING_PROC"
        echo ""
        echo "   To avoid overlapping with other sites, specify an alternate port. Example:"
        echo "   PORT=8098 bash deploy_vps.sh"
        echo "=================================================="
        exit 1
    else
        echo "ℹ️  Port ${PORT} is occupied by previous nutsandnutrition-app container (will be safely recreated)."
    fi
else
    echo "✅ Port ${PORT} is free and ready."
fi

# 1. Setup / Update production .env
if [ ! -f "laravel-react-app/.env" ]; then
    echo "📄 Creating production .env configuration..."
    cat <<EOF > laravel-react-app/.env
APP_NAME="Nuts & Nutrition"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://${DOMAIN}

APP_LOCALE=en
APP_FALLBACK_LOCALE=en

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=nutsandnutrition-db
DB_PORT=3306
DB_DATABASE=nutsandnutrition
DB_USERNAME=nuts_user
DB_PASSWORD=NutsLive2026!

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false

QUEUE_CONNECTION=database
CACHE_STORE=database
FILESYSTEM_DISK=public

VITE_APP_NAME="\${APP_NAME}"
EOF
else
    echo "📄 Verifying database connection parameters in existing .env..."
    # Ensure bridge network hostname is used, not 127.0.0.1
    sed -i 's/^DB_HOST=.*/DB_HOST=nutsandnutrition-db/' laravel-react-app/.env
    sed -i 's/^DB_PORT=.*/DB_PORT=3306/' laravel-react-app/.env
fi

# 2. Build and start Docker containers (Isolated Bridge Network)
echo "🐳 Building and starting Docker containers..."
PORT="$PORT" DB_PORT="$DB_PORT" docker compose up -d --build

# 3. Wait for database container to be fully ready
echo "⏳ Waiting for MariaDB container (nutsandnutrition-db:3306) to be ready..."
sleep 5
for i in {1..30}; do
    if docker exec nutsandnutrition-db mariadb -u nuts_user -pNutsLive2026! -e "SELECT 1;" nutsandnutrition >/dev/null 2>&1; then
        echo "✅ MariaDB is fully ready and accepting queries!"
        break
    fi
    echo "Waiting for MariaDB ($i/30)..."
    sleep 2
done

# 4. Copy compiled Vite assets to host folder (safety sync)
echo "📦 Syncing compiled Vite build assets..."
mkdir -p laravel-react-app/public/build
docker cp nutsandnutrition-app:/var/www/html/public/build/. laravel-react-app/public/build/ || true

# 5. Application key generation if needed
if ! grep -q "APP_KEY=base64:" laravel-react-app/.env; then
    echo "🔑 Generating application key..."
    docker exec nutsandnutrition-app php artisan key:generate --force
fi

# 6. Database Migrations and Seeders
echo "🗄️ Running database migrations..."
docker exec nutsandnutrition-app php artisan migrate --force

echo "👤 Ensuring Super Admin account is seeded..."
docker exec nutsandnutrition-app php artisan db:seed --class=AdminSeeder --force

# 7. Symlink storage & Optimize caches
echo "⚡ Optimizing Laravel caches..."
docker exec nutsandnutrition-app php artisan storage:link || true
docker exec nutsandnutrition-app php artisan optimize:clear
docker exec nutsandnutrition-app php artisan optimize
docker exec nutsandnutrition-app php artisan view:cache

# 8. Setup Host Nginx Reverse Proxy
echo "🌐 Configuring Host Nginx reverse proxy for ${DOMAIN}..."
cat <<EOF > /etc/nginx/sites-available/${DOMAIN}.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 256M;

    # Forward to isolated Docker upstream
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/${DOMAIN}.conf

# 9. Test and reload Host Nginx safely
echo "🔍 Validating Nginx configuration syntax..."
if nginx -t; then
    echo "✅ Nginx syntax is valid. Reloading Nginx..."
    systemctl reload nginx
else
    echo "❌ Error in Nginx configuration! Check above output."
    exit 1
fi

# 10. Verification Tests
echo "=================================================="
echo "🧪 Running Post-Deployment Health Check..."
echo "=================================================="

echo -n "1. Testing Docker container directly (http://127.0.0.1:${PORT})... "
CONTAINER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" || echo "FAIL")
echo "HTTP $CONTAINER_HTTP"

echo -n "2. Testing Host Nginx proxy for ${DOMAIN}... "
ROUTING_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" "http://127.0.0.1/" || echo "FAIL")
echo "HTTP $ROUTING_HTTP"

echo ""
echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE! Nuts & Nutrition is LIVE!"
echo "Upstream Port: 127.0.0.1:${PORT}"
echo "Database Port: 127.0.0.1:${DB_PORT}"
echo "Web URL:       http://${DOMAIN}"
echo "=================================================="
echo ""
echo "💡 To configure SSL (HTTPS) with Certbot, run:"
echo "   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "=================================================="
