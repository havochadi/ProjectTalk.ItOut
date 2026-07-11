# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (layer-cache friendly)
COPY package.json package-lock.json ./
COPY packages/lib/package.json   ./packages/lib/
COPY packages/ui/package.json    ./packages/ui/
COPY apps/web/package.json       ./apps/web/

# Install all workspace deps
RUN npm ci --workspaces --include-workspace-root

# Copy source
COPY packages/lib ./packages/lib
COPY packages/ui  ./packages/ui
COPY apps/web     ./apps/web

# Build lib/ui first, then web
RUN npm run build --workspace=@talkitout/lib
RUN npm run build --workspace=@talkitout/web

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Nginx config for SPA routing (client-side React Router)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Serve all routes through index.html (SPA)\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Gzip static assets\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;\n\
    gzip_min_length 1024;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
