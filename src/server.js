import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createServer() {
  const server = new McpServer({ name: "pokeledger-mcp", version: "0.1.0" });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Check that the PokeLedger server is reachable. Returns \"pong\".",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: "pong" }] }),
  );

  return server;
}
