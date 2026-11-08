import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPing } from "../tools/ping/index.js";
import { registerDevops } from "../tools/devops/index.js";
import { registerReview } from "../tools/review/index.js";
import { registerKeepTrack } from "../tools/keep_track/index.js";
import { resolveMemoryDir } from "../tools/keep_track/memory-store.js";
import { registerNeuralyze } from "../tools/neuralyze/index.js";
import { registerStartWorkflow } from "../tools/start_workflow/index.js";
import { loadServerTexts, resolveContextDir } from "../tools/start_workflow/context.js";

// Crée le serveur MCP et déclare ses seuls outils publics ; contextDir pointe vers les fichiers de règles, memoryDir vers la mémoire de keep_track et random vers la source d'aléa.
export function createServer({ contextDir = resolveContextDir(), memoryDir = resolveMemoryDir(), random = Math.random } = {}) {
  const { instructions } = loadServerTexts(contextDir);
  const server = new McpServer({ name: "pokeledger-mcp", version: "0.1.0" }, { instructions });

  registerPing(server);
  registerStartWorkflow(server, contextDir, random);
  registerKeepTrack(server, memoryDir);
  registerNeuralyze(server, memoryDir);
  registerDevops(server);
  registerReview(server);

  return server;
}
