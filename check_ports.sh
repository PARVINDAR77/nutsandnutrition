#!/bin/bash

# ==============================================================================
# VPS Port & Domain Routing Diagnostic Tool
# Diagnoses port conflicts between Nuts & Nutrition, Knotelle, Convoza, etc.
# ==============================================================================

echo "=================================================="
echo "🔍 VPS PORT & ROUTING DIAGNOSTIC REPORT"
echo "=================================================="

echo ""
echo "1️⃣  DOCKER CONTAINERS RUNNING & PORTS:"
echo "--------------------------------------------------"
if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "Docker is not installed or not in PATH."
fi

echo ""
echo "2️⃣  CHECKING KEY PORTS (80, 443, 8096, 8098, 8099, 9000, 3306, 3307):"
echo "--------------------------------------------------"
for port in 80 443 8096 8098 8099 9000 3306 3307; do
    echo -n "Port $port: "
    if ss -tulnp 2>/dev/null | grep -q ":${port} "; then
        ss -tulnp 2>/dev/null | grep ":${port} " | head -n 1 | awk '{print $1, $5, $7}'
    else
        echo "FREE (Nothing listening)"
    fi
done

echo ""
echo "3️⃣  ENABLED NGINX SITES (/etc/nginx/sites-enabled/):"
echo "--------------------------------------------------"
if [ -d "/etc/nginx/sites-enabled" ]; then
    ls -la /etc/nginx/sites-enabled/
    echo ""
    echo "Checking 'default_server' directives in Nginx:"
    grep -rn "default_server" /etc/nginx/sites-enabled/ || echo "No explicit default_server found."
    echo ""
    echo "Checking domain server_name configs:"
    grep -rn "server_name" /etc/nginx/sites-enabled/ || true
else
    echo "Directory /etc/nginx/sites-enabled does not exist."
fi

echo ""
echo "4️⃣  CONNECTIVITY & ROUTING TEST:"
echo "--------------------------------------------------"
echo -n "Testing 127.0.0.1:8096 (Nuts & Nutrition container)... "
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://127.0.0.1:8096/ || echo "Failed to reach"

echo -n "Testing Nginx with Host: nutsandnutrition.shop... "
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" -H "Host: nutsandnutrition.shop" http://127.0.0.1/ || echo "Failed to reach"

echo ""
echo "=================================================="
echo "✅ Diagnostic complete."
echo "=================================================="
