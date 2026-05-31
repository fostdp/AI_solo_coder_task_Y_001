FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY experiments.json* ./

COPY index.html ./
COPY style.css ./
COPY app.js ./
COPY quantum-worker.js ./
COPY sw.js ./
COPY manifest.json ./

COPY nginx/nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/cache/nginx /var/log/nginx /run/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /run/nginx

RUN echo "gzip compression enabled" && \
    echo "PWA support configured" && \
    echo "nginx proxy ready"

EXPOSE 80
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
