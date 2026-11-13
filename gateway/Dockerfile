# Build context: repository root
FROM node:22-alpine AS build
WORKDIR /app
COPY protocol/package*.json protocol/tsconfig.json ./protocol/
COPY protocol/src ./protocol/src
RUN cd protocol && npm ci --no-audit --no-fund && npm run build
COPY gateway/package*.json gateway/tsconfig.json ./gateway/
RUN cd gateway && npm ci --no-audit --no-fund
COPY gateway/src ./gateway/src
RUN cd gateway && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/protocol ./protocol
COPY --from=build /app/gateway ./gateway
RUN adduser -D app && chown -R app /app
USER app
WORKDIR /app/gateway
EXPOSE 3001
CMD ["node", "dist/index.js"]
