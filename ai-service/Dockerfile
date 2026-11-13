# Build context: repository root (reads knowledge-base/ and optional .env GEMINI_* at runtime)
FROM node:22-alpine AS build
WORKDIR /app
COPY ai-service/package*.json ai-service/tsconfig.json ./ai-service/
RUN cd ai-service && npm ci --no-audit --no-fund
COPY ai-service/src ./ai-service/src
RUN cd ai-service && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/ai-service ./ai-service
COPY knowledge-base/ /app/knowledge-base/
RUN adduser -D app && chown -R app /app
USER app
WORKDIR /app/ai-service
# Loopback inside the container is unreachable; compose overrides BIND_HOST for the internal network.
ENV KNOWLEDGE_BASE_PATH=/app/knowledge-base BIND_HOST=0.0.0.0
EXPOSE 5000
CMD ["node", "dist/index.js"]
