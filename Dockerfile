FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev && npm install --no-save tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/pedagogicalData.ts ./src/pedagogicalData.ts
COPY --from=builder /app/src/types ./src/types
RUN mkdir -p /app/data

# Install tsx globally for lightweight TS execution
RUN npm install -g tsx

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/config || exit 1

CMD ["tsx", "server.ts"]
