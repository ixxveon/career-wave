# Build stage: React/Vite production bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Vite variables are embedded into the bundle at build time.
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_FASTAPI_BASE_URL
ARG VITE_FASTAPI_WS_URL
ARG VITE_TOSS_CLIENT_KEY
ARG VITE_COOKIE_DOMAIN
ARG VITE_USE_MOCK_DATA=false

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
ENV VITE_FASTAPI_BASE_URL=${VITE_FASTAPI_BASE_URL}
ENV VITE_FASTAPI_WS_URL=${VITE_FASTAPI_WS_URL}
ENV VITE_TOSS_CLIENT_KEY=${VITE_TOSS_CLIENT_KEY}
ENV VITE_COOKIE_DOMAIN=${VITE_COOKIE_DOMAIN}
ENV VITE_USE_MOCK_DATA=${VITE_USE_MOCK_DATA}

RUN npm run build

# Runtime stage: serve the generated static files with Nginx
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
