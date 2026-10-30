import http from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createBearerGuard } from "./auth.js";
import { createServer } from "./server.js";

const MCP_PATH = "/mcp";

// Ouvre une session MCP : un transport et un serveur dédiés, retirés du registre à la fermeture de la session.
async function openSession(sessions, contextDir) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: randomUUID,
    onsessioninitialized: (sessionId) => sessions.set(sessionId, transport),
  });
  transport.onclose = () => sessions.delete(transport.sessionId);
  await createServer({ contextDir }).connect(transport);
  return transport;
}

// Crée le serveur HTTP (non démarré) qui expose MCP sur /mcp et coupe sans réponse toute requête non authentifiée.
export function createHttpServer({ token, contextDir } = {}) {
  const isAuthorized = createBearerGuard(token);
  const sessions = new Map();

  return http.createServer(async (req, res) => {
    // Aucun octet n'est renvoyé sans jeton valide : le client ne peut pas savoir qu'un serveur MCP écoute.
    if (!isAuthorized(req.headers.authorization)) {
      req.socket.destroy();
      return;
    }
    if (new URL(req.url, "http://localhost").pathname !== MCP_PATH) {
      res.writeHead(404).end();
      return;
    }
    const transport = sessions.get(req.headers["mcp-session-id"]) ?? (await openSession(sessions, contextDir));
    await transport.handleRequest(req, res);
  });
}
