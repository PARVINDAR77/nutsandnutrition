# Stage 1: Build Frontend Assets (Vite + React + Tailwind)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY laravel-react-app/package.json laravel-react-app/package-lock.json* ./
RUN npm ci || npm install
COPY laravel-react-app/ ./
RUN npm run build

# Stage 2: Production PHP-FPM + Nginx Application
FROM php:8.2-fpm-alpine

# Install system dependencies and Nginx
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    libxml2-dev

# Copy official Composer binary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        bcmath \
        zip \
        gd \
        intl \
        opcache

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY laravel-react-app/ /var/www/html/

# Copy built frontend assets from frontend-builder
COPY --from=frontend-builder /app/public/build /var/www/html/public/build

# Install Composer dependencies
RUN if [ ! -f /var/www/html/vendor/autoload.php ]; then \
        composer install --no-dev --optimize-autoloader --no-interaction; \
    fi

# Copy Nginx, PHP, and Supervisor configs
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY docker/php-fpm-pool.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/supervisord.conf /etc/supervisord.conf

# Setup permissions
RUN mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8096

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
