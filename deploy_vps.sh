#!/bin/bash
set -e

# ==============================================================================
# Nuts & Nutrition - VPS Safe Deployment Script
# Port: 8096 (Upstream Web), 3307 (Isolated MariaDB)
# Zero overlap with existing VPS sites (Knotelle, Convoza, AdMafia, etc.)
# ==============================================================================

PROJECT_DIR="/home/ubuntu/nutsandnutrition"
DOMAIN="nutsandnutrition.shop"
PORT="8096"
DB_PORT="3307"

echo "=================================================="
echo "🚀 Starting Deployment for Nuts & Nutrition"
echo "=================================================="

cd "$PROJECT_DIR" || exit 1

# 1. Setup production .env if not exists
if [ ! -f "laravel-react-app/.env" ]; then
    echo "📄 Creating production .env configuration..."
    cat <<EOF > laravel-react-app/.env
APP_NAME="Nuts & Nutrition"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://nutsandnutrition.shop

APP_LOCALE=en
APP_FALLBACK_LOCALE=en

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
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
fi

# 2. Build and start Docker containers
echo "🐳 Building and starting Docker containers..."
docker compose up -d --build

# 3. Wait for database container to be fully ready
echo "⏳ Waiting for MariaDB container on 127.0.0.1:3307 to be fully ready..."
sleep 5
for i in {1..30}; do
    if docker exec nutsandnutrition-db mariadb -u nuts_user -pNutsLive2026! -e "SELECT 1;" nutsandnutrition >/dev/null 2>&1; then
        echo "✅ MariaDB is fully ready and accepting queries!"
        break
    fi
    echo "Waiting for MariaDB ($i/30)..."
    sleep 2
done

# 4. Copy compiled Vite assets to host folder (prevents volume mount masking)
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
echo "🌐 Configuring Host Nginx reverse proxy..."
cat <<EOF > /etc/nginx/sites-available/nutsandnutrition.shop.conf
server {
    listen 80;
    listen [::]:80;
    server_name nutsandnutrition.shop www.nutsandnutrition.shop;

    client_max_body_size 256M;

    location / {
        proxy_pass http://127.0.0.1:8096;
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

ln -sf /etc/nginx/sites-available/nutsandnutrition.shop.conf /etc/nginx/sites-enabled/nutsandnutrition.shop.conf

# 9. Test and reload Host Nginx safely
echo "🔍 Validating Nginx configuration syntax..."
nginx -t
systemctl reload nginx

echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE! Nuts & Nutrition is LIVE!"
echo "Upstream Port: 127.0.0.1:8096"
echo "Database Port: 127.0.0.1:3307"
echo "Web URL: http://nutsandnutrition.shop"
echo "=================================================="
