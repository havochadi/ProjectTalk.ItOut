FROM node:18-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/lib/package.json ./packages/lib/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install only the workspaces needed by the API image
RUN npm ci --workspace=@talkitout/lib --workspace=@talkitout/api --include-workspace-root

# Copy source code
COPY packages/lib ./packages/lib
COPY apps/api ./apps/api

# Build lib first, then api
RUN npm run build --workspace=@talkitout/lib
RUN npm run build --workspace=@talkitout/api

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "run", "start", "--workspace=@talkitout/api"]
