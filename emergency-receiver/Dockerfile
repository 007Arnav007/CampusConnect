# Build context: repository root. Needs Node >= 22.5 for node:sqlite.
FROM node:22-alpine AS build
WORKDIR /app
COPY protocol/package*.json protocol/tsconfig.json ./protocol/
COPY protocol/src ./protocol/src
RUN cd protocol && npm ci --no-audit --no-fund && npm run build
COPY emergency-receiver/package*.json emergency-receiver/tsconfig.json ./emergency-receiver/
RUN cd emergency-receiver && npm ci --no-audit --no-fund
COPY emergency-receiver/src ./emergency-receiver/src
RUN cd emergency-receiver && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/protocol ./protocol
COPY --from=build /app/emergency-receiver ./emergency-receiver
RUN adduser -D app && mkdir -p /data && chown -R app /app /data
USER app
WORKDIR /app/emergency-receiver
ENV RECEIVER_DB=/data/receiver.db BIND_HOST=0.0.0.0
EXPOSE 4001 41234/udp 41235
CMD ["node", "dist/index.js"]
