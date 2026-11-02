import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPing } from "../tools/ping/index.js";
import { registerKeepTrack } from "../tools/keep_track/index.js";
import { resolveMemoryDir } from "../tools/keep_track/memory-store.js";
import { registerNeuralyze } from "../tools/neuralyze/index.js";
import { registerStartWorkflow } from "../tools/start_workflow/index.js";
import { loadServerTexts, resolveContextDir } from "../tools/start_workflow/context.js";

// Crée le serveur MCP et déclare ses seuls outils publics ; contextDir pointe vers les fichiers de règles et memoryDir vers la mémoire de keep_track.
export function createServer({ contextDir = resolveContextDir(), memoryDir = resolveMemoryDir() } = {}) {
  const { instructions } = loadServerTexts(contextDir);
  const server = new McpServer({ name: "pokeledger-mcp", version: "0.1.0" }, { instructions });

  registerPing(server);
  registerStartWorkflow(server, contextDir);
  registerKeepTrack(server, memoryDir);
  registerNeuralyze(server, memoryDir);

  return server;
}
