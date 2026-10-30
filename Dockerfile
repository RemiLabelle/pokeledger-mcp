FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY context ./context

USER node

# MCP over stdio: run with `docker run -i --rm`, stdin/stdout carry JSON-RPC.
ENTRYPOINT ["node", "src/index.js"]
