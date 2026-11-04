import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

const USAGE_FILES = { direct: "direct.md", automatic: "automatic.md" };

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Déclare l'outil qui renvoie le skill devops, avec la consigne d'usage propre à son mode de chargement.
export function registerDevops(server) {
  server.registerTool(
    "devops",
    {
      title: "DevOps skill",
      description: readText("tool-description.md"),
      inputSchema: {
        trigger: z
          .enum(Object.keys(USAGE_FILES))
          .default("direct")
          .describe("How the skill is loaded: \"direct\" when the operator asks for it, \"automatic\" when a devops task starts"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    // Relit les textes à chaque appel pour que les modifications s'appliquent sans redémarrage.
    async ({ trigger }) => ({
      content: [readText(USAGE_FILES[trigger]), readText("skill/SKILL.md")].map((text) => ({ type: "text", text })),
    }),
  );
}
