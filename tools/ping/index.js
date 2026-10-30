// Déclare l'outil ping, qui confirme que le serveur répond.
export function registerPing(server) {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Check that the PokeLedger server is reachable. Returns \"pong\".",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: "pong" }] }),
  );
}
