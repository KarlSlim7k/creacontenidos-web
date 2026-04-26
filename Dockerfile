FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx libpq postgresql15-client \
  && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev \
  && docker-php-ext-install pdo_pgsql pgsql \
  && apk del .build-deps

COPY apps/web /usr/share/nginx/html
COPY admin /usr/share/nginx/html/admin
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY api /usr/share/nginx/html/api
COPY data /usr/share/nginx/html/data

RUN chown -R www-data:www-data /usr/share/nginx/html/data

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D -R && nginx -g 'daemon off;'"]
