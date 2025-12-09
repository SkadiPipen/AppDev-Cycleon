# Stage 1 - Build Frontend (Vite with Wayfinder) - UPDATED NODE VERSION
FROM node:20-alpine AS frontend

# Install PHP in frontend stage for wayfinder plugin
RUN apk add --no-cache php

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source files
COPY vite.config.ts ./
COPY resources/ ./resources/
COPY public/ ./public/

# Copy composer files for wayfinder plugin
COPY composer.json ./
COPY composer.lock ./

# Install PHP dependencies for wayfinder
RUN apk add --no-cache composer && \
    composer install --no-dev --no-interaction

# Build
RUN npm run build

# Stage 2 - Backend (Laravel + PHP + Nginx)
FROM php:8.2-fpm-alpine

# Install system dependencies (REMOVED postgresql-dev)
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
    oniguruma-dev

# Install PHP extensions (REMOVED pdo_pgsql)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
    zip \
    mbstring \
    exif \
    pcntl \
    gd

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

# Create minimal .env for production
RUN echo "APP_ENV=production" > .env && \
    echo "APP_DEBUG=false" >> .env && \
    echo "APP_KEY=${APP_KEY:-base64:$(openssl rand -base64 32)}" >> .env && \
    echo "LOG_CHANNEL=stderr" >> .env && \
    echo "SESSION_DRIVER=cookie" >> .env && \
    echo "CACHE_STORE=file" >> .env && \
    echo "QUEUE_CONNECTION=sync" >> .env && \
    echo "VITE_APP_NAME=\"My Laravel App\"" >> .env

# Generate app key
RUN php artisan key:generate --force

# Clear caches
RUN php artisan config:clear && \
    php artisan route:clear && \
    php artisan view:clear && \
    php artisan cache:clear

RUN mkdir -p /run/nginx /var/log/nginx
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Health check
RUN echo '<?php header("Content-Type: application/json"); echo json_encode(["status" => "ok", "time" => time()]);' > /var/www/html/public/health.php

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
