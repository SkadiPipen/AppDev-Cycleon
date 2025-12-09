# Stage 1 - Build Frontend
FROM node:20-alpine AS frontend
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy modified vite config (without wayfinder)
COPY vite.config.build.ts ./vite.config.ts

# Copy source files
COPY resources/ ./resources/
COPY public/ ./public/

# Install and build
RUN npm ci
RUN npm run build

# Stage 2 - Backend (Laravel + PHP + Nginx)
FROM php:8.4-fpm-alpine

# Install system dependencies (NO DATABASE)
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

# Install PHP extensions (NO DATABASE)
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

# Add these lines to your .env creation:
RUN echo "APP_ENV=production" > .env && \
    echo "APP_DEBUG=false" >> .env && \
    echo "APP_KEY=${APP_KEY:-base64:$(openssl rand -base64 32)}" >> .env && \
    echo "LOG_CHANNEL=stderr" >> .env && \
    echo "SESSION_DRIVER=cookie" >> .env && \
    echo "CACHE_STORE=file" >> .env && \
    echo "QUEUE_CONNECTION=sync" >> .env && \
    echo "VITE_APP_NAME=\"My Laravel App\"" >> .env && \
    echo "ASSET_URL=https://appdev-cycleon.onrender.com" >> .env

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
