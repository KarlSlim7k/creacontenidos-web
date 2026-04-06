FROM php:8.2-fpm-alpine

RUN docker-php-ext-install pdo_json

RUN apk add --no-cache nginx

RUN echo "daemon off;" >> /etc/nginx/http.d/default.conf

COPY apps/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY api /var/www/html/api
COPY data /var/www/html/data

EXPOSE 80

CMD ["php-fpm", "-R"]
