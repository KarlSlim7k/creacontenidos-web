FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx

RUN echo "daemon off;" >> /etc/nginx/http.d/default.conf

COPY apps/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY api /usr/share/nginx/html/api
COPY data /usr/share/nginx/html/data

EXPOSE 80

CMD ["php-fpm", "-R"]
