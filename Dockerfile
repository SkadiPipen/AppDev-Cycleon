# Stage 1 - Build Frontend (Vite with Wayfinder)
FROM node:18-alpine AS frontend
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source files
COPY vite.config.ts ./
COPY resources/ ./resources/
COPY public/ ./public/

# Build
RUN npm run build

# Stage 2 - Backend (Laravel + PHP + Nginx)
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    zip \
    unzip \
    git \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    postgresql-dev

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    mbstring \
    exif \
    pcntl \
    gd

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application files
COPY . .

# Copy built frontend from Stage 1
COPY --from=frontend /app/public/build ./public/build

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data \
    /var/www/html/storage \
    /var/www/html/bootstrap/cache \
    /var/www/html/public/build

# Create production .env without database
RUN if [ -f .env.example ]; then cp .env.example .env; else touch .env; fi

# Configure environment for no-database setup
RUN sed -i '/DB_/d' .env && \
    sed -i '/REDIS_/d' .env && \
    sed -i '/MEMCACHED_/d' .env && \
    echo "" >> .env && \
    echo "# Database disabled for deployment" >> .env && \
    echo "SESSION_DRIVER=cookie" >> .env && \
    echo "CACHE_STORE=file" >> .env && \
    echo "QUEUE_CONNECTION=sync" >> .env && \
    echo "LOG_CHANNEL=stderr" >> .env && \
    echo "VITE_APP_NAME=\"Laravel App\"" >> .env

# Generate app key if not exists
RUN grep -q "^APP_KEY=" .env || php artisan key:generate --force

# Clear caches
RUN php artisan config:clear && \
    php artisan route:clear && \
    php artisan view:clear && \
    php artisan cache:clear

# Create nginx directories
RUN mkdir -p /run/nginx /var/log/nginx

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Health check
RUN echo '<?php header("Content-Type: application/json"); echo json_encode(["status" => "ok", "time" => time()]);' > /var/www/html/public/health.php

EXPOSE 8000

# Start application with supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
