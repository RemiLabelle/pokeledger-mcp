import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildContext, loadManifest, loadServerTexts, resolveContextDir } from "./context.js";

// Crée le serveur MCP et déclare ses outils ; contextDir pointe vers les fichiers de règles.
export function createServer({ contextDir = resolveContextDir() } = {}) {
  const { instructions, toolDescription } = loadServerTexts(contextDir);
  const sectionIds = loadManifest(contextDir).sections.map((s) => s.id);
  const server = new McpServer({ name: "pokeledger-mcp", version: "0.1.0" }, { instructions });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Check that the PokeLedger server is reachable. Returns \"pong\".",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: "pong" }] }),
  );

  server.registerTool(
    "get_workflow_context",
    {
      title: "Workflow context",
      description: toolDescription,
      inputSchema: {
        sections: z
          .array(z.string())
          .optional()
          .describe(`Section ids to return (all when omitted): ${sectionIds.join(", ")}`),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    // Relit les fichiers de contexte à chaque appel pour que les modifications s'appliquent sans redémarrage.
    async ({ sections }) => {
      try {
        return { content: [{ type: "text", text: buildContext(contextDir, sections) }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error.message }] };
      }
    },
  );

  return server;
}
