FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx libpq postgresql-client nodejs npm dcron \
  && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev \
  && docker-php-ext-install pdo_pgsql pgsql \
  && apk del .build-deps

COPY apps/web /usr/share/nginx/html
COPY admin /usr/share/nginx/html/admin
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY api /usr/share/nginx/html/api
COPY data /usr/share/nginx/html/data
COPY config /usr/share/nginx/html/config
COPY services /usr/share/nginx/html/services
COPY cron/crea-contenidos.crontab /etc/crontabs/root

RUN chown -R www-data:www-data /usr/share/nginx/html/data \
  && mkdir -p /var/log/crea \
  && cd /usr/share/nginx/html/services && npm install --production

EXPOSE 80

CMD ["sh", "-c", "crond && php-fpm -D -R && nginx -g 'daemon off;'"]
