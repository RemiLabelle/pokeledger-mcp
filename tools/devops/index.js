import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");
const REFERENCES_DIR = "skill/references";

const USAGE_FILES = { direct: "direct.md", automatic: "automatic.md" };

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Liste les références livrées avec le skill, par nom de fichier sans extension.
function listReferences() {
  return readdirSync(path.join(CONTEXT_DIR, REFERENCES_DIR)).map((file) => path.basename(file, ".md"));
}

// Assemble les textes du skill principal, précédés de la consigne propre au mode de chargement.
function skillTexts(trigger) {
  return [readText(USAGE_FILES[trigger]), readText("skill-notes.md"), readText("skill/SKILL.md")];
}

// Déclare l'outil qui renvoie le skill devops ou l'une de ses références.
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
        reference: z.enum(listReferences()).optional().describe("Reference of the skill to return instead of the main skill"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    // Relit les textes à chaque appel pour que les modifications s'appliquent sans redémarrage.
    async ({ trigger, reference }) => {
      const texts = reference ? [readText(`${REFERENCES_DIR}/${reference}.md`)] : skillTexts(trigger);
      return { content: texts.map((text) => ({ type: "text", text })) };
    },
  );
}
