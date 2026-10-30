FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY tools ./tools

USER node

# MCP over HTTP on /mcp: bind every interface inside the container, publish on the host loopback only
# (`-p 127.0.0.1:3000:3000`). PL_MCP_TOKEN must be passed at run time, never baked into the image.
ENV PL_MCP_HOST=0.0.0.0 PL_MCP_PORT=3000
EXPOSE 3000
ENTRYPOINT ["node", "src/index.js"]
