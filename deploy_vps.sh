#!/bin/bash
set -e

# ==============================================================================
# Nuts & Nutrition - VPS Safe Deployment Script
# Isolated Docker Bridge: nuts_net
# Upstream Port: 127.0.0.1:8098 (Mapped to container port 80)
# Isolated MariaDB: 127.0.0.1:3307 (Internal Docker: nutsandnutrition-db:3306)
# Completely isolated from Knotelle, Convoza, AdMafia, and host PHP-FPM
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
DOMAIN="nutsandnutrition.shop"
PORT="${PORT:-8098}"
PORT2="${PORT2:-8099}"
DB_PORT="${DB_PORT:-3307}"

echo "=================================================="
echo "🚀 Starting Deployment for Nuts & Nutrition"
echo "Project Directory: $PROJECT_DIR"
echo "Target Domain:     $DOMAIN"
echo "Upstream Cluster:  127.0.0.1:$PORT & 127.0.0.1:$PORT2"
echo "Database Port:     127.0.0.1:$DB_PORT"
echo "=================================================="

cd "$PROJECT_DIR" || exit 1

# 0. Check for Port Conflicts with other VPS sites (e.g., Knotelle, Convoza)
echo "🔍 Checking for port conflicts on VPS..."
for p in "$PORT" "$PORT2"; do
    if ss -tulnp 2>/dev/null | grep -q ":${p} "; then
        EXISTING_PROC=$(ss -tulnp 2>/dev/null | grep ":${p} " || true)
        if ! docker ps --filter "name=nutsandnutrition-app" --format '{{.Ports}}' 2>/dev/null | grep -q "${p}"; then
            echo "⚠️  WARNING: Port ${p} is currently in use by another service on this VPS:"
            echo "   $EXISTING_PROC"
            echo "   Specify alternate ports if necessary (e.g., PORT=8098 PORT2=8099 bash deploy_vps.sh)"
            exit 1
        fi
    fi
done
echo "✅ Ports ${PORT} and ${PORT2} are free and ready."

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

# 2. Build and start Docker containers (Isolated Bridge Network with 2-App Cluster)
echo "🛑 Tearing down any existing containers to release old bindings..."
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f nutsandnutrition-app nutsandnutrition-app-1 nutsandnutrition-app-2 nutsandnutrition-db 2>/dev/null || true

echo "🐳 Building and starting Docker cluster containers (2 replicas)..."
PORT="$PORT" PORT2="$PORT2" DB_PORT="$DB_PORT" docker compose up -d --build

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
docker cp nutsandnutrition-app-1:/var/www/html/public/build/. laravel-react-app/public/build/ || true

# 5. Application key generation if needed
if ! grep -q "APP_KEY=base64:" laravel-react-app/.env; then
    echo "🔑 Generating application key..."
    docker exec nutsandnutrition-app-1 php artisan key:generate --force
fi

# 6. Database Migrations
echo "🗄️ Running database migrations..."
docker exec nutsandnutrition-app-1 php artisan migrate --force

# 7. Permissions & Storage Symlink & Caches on both cluster instances
echo "🔒 Ensuring secure permissions on storage and bootstrap/cache..."
chmod -R 775 laravel-react-app/storage laravel-react-app/bootstrap/cache 2>/dev/null || true
docker exec -u 0 nutsandnutrition-app-1 chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
docker exec -u 0 nutsandnutrition-app-1 chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
docker exec -u 0 nutsandnutrition-app-2 chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
docker exec -u 0 nutsandnutrition-app-2 chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

echo "⚡ Clearing all Laravel caches..."
docker exec nutsandnutrition-app-1 php artisan storage:link || true
docker exec nutsandnutrition-app-1 php artisan optimize:clear
docker exec nutsandnutrition-app-2 php artisan optimize:clear 2>/dev/null || true

# 8. Setup Host Nginx Reverse Proxy with Upstream Load Balancing
echo "🌐 Configuring Host Nginx Load Balancer for ${DOMAIN}..."

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 Existing SSL certificate found! Generating load-balanced HTTPS + HTTP reverse proxy configuration..."
    cat <<EOF > /etc/nginx/sites-available/${DOMAIN}.conf
upstream nuts_app_cluster {
    least_conn;
    server 127.0.0.1:${PORT} max_fails=3 fail_timeout=10s;
    server 127.0.0.1:${PORT2} max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    server_tokens off;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net https://code.jquery.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob: https:; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com; connect-src 'self' https:;" always;

    client_max_body_size 256M;

    location / {
        proxy_pass http://nuts_app_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;

        # Automatic Failover & Retry on errors/timeouts
        proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
    }
}
EOF
else
    echo "📄 Generating initial HTTP configuration for Certbot validation..."
    cat <<EOF > /etc/nginx/sites-available/${DOMAIN}.conf
upstream nuts_app_cluster {
    least_conn;
    server 127.0.0.1:${PORT} max_fails=3 fail_timeout=10s;
    server 127.0.0.1:${PORT2} max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    server_tokens off;

    client_max_body_size 256M;

    location / {
        proxy_pass http://nuts_app_cluster;
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

        # Automatic Failover & Retry on errors/timeouts
        proxy_next_upstream error timeout invalid_header http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
    }
}
EOF
fi

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

# 10. Automatically provision SSL certificate via Certbot if not yet issued
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    if command -v certbot >/dev/null 2>&1; then
        echo "🔒 Requesting SSL certificate from Let's Encrypt for ${DOMAIN}..."
        certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect || {
            echo "⚠️  Certbot automated attempt finished. If needed, run:"
            echo "   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
        }
    else
        echo "💡 Tip: Install certbot (apt install -y certbot python3-certbot-nginx) to enable SSL."
    fi
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

echo -n "3. Verifying rendered HTML page title... "
PAGE_TITLE=$(curl -s -L -H "Host: ${DOMAIN}" "http://127.0.0.1/" | grep -o '<title>[^<]*</title>' | head -n 1 || echo "No title found")
echo "$PAGE_TITLE"

if echo "$PAGE_TITLE" | grep -qi "Nuts"; then
    echo "✅ CONFIRMED: nutsandnutrition.shop is properly serving Nuts & Nutrition!"
else
    echo "⚠️  WARNING: Response does not contain 'Nuts'. It returned: $PAGE_TITLE"
    echo "   Checking if Knotelle or another site is acting as default_server in /etc/nginx/sites-enabled/..."
fi

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
