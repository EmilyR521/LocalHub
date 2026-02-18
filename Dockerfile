# LocalHub – API + optional frontend. Build from repo root: docker build -t localhub .
# Secrets via env_file or -e; do not bake into image.

# Stage 1: build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY frontend/ ./
RUN npm run build

# Stage 2: build backend
FROM node:22-alpine AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY backend/ ./
RUN npm run build

# Stage 3: runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=backend-build /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY --from=backend-build /app/dist ./dist
COPY --from=frontend /app/frontend/dist/localhub/browser ./public
ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public
EXPOSE 3000
CMD ["node", "dist/app.js"]
