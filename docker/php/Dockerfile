FROM php:8.3-fpm-alpine

# System dependencies
RUN apk add --no-cache \
    autoconf \
    bash \
    curl \
    g++ \
    git \
    libpng-dev \
    libzip-dev \
    make \
    oniguruma-dev \
    postgresql-dev \
    unzip \
    zip \
    supervisor

# PHP extensions
RUN docker-php-ext-install \
    bcmath \
    mbstring \
    pdo \
    pdo_pgsql \
    pgsql \
    pcntl \
    zip

# Redis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

EXPOSE 9000

CMD ["php-fpm"]
