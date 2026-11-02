FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY tools ./tools

# keep_track memory: a volume mounted here inherits the node user's ownership.
RUN mkdir -p /home/node/.pokeledger/keep-track && chown -R node:node /home/node/.pokeledger

USER node

# MCP over stdio: run with `docker run -i --rm`, stdin/stdout carry JSON-RPC.
ENTRYPOINT ["node", "src/index.js"]
