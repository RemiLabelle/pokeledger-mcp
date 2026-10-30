import { z } from "zod";
import { buildContext, loadManifest, loadServerTexts } from "./context.js";

// Déclare l'outil qui renvoie les règles de travail lues dans contextDir.
export function registerStartWorkflow(server, contextDir) {
  const { toolDescription } = loadServerTexts(contextDir);
  const sectionIds = loadManifest(contextDir).sections.map((s) => s.id);

  server.registerTool(
    "start_workflow",
    {
      title: "Start workflow",
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
}
