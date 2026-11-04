import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Déclare l'outil qui renvoie le skill devops, avec la consigne d'usage destinée à l'agent.
export function registerDevops(server) {
  server.registerTool(
    "devops",
    {
      title: "DevOps skill",
      description: readText("tool-description.md"),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    // Relit les textes à chaque appel pour que les modifications s'appliquent sans redémarrage.
    async () => ({
      content: [readText("direct.md"), readText("skill/SKILL.md")].map((text) => ({ type: "text", text })),
    }),
  );
}
