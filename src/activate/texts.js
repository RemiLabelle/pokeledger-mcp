import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TEXTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

const TEMPLATE_FILES = {
  created: "created.md",
  replaced: "replaced.md",
  exists: "exists.md",
};

// Charge les gabarits des messages d'activation depuis le dossier de textes.
export function loadTexts(dir = DEFAULT_TEXTS_DIR) {
  const texts = {};
  for (const [key, file] of Object.entries(TEMPLATE_FILES)) {
    texts[key] = readFileSync(path.join(dir, file), "utf8").trim();
  }
  return texts;
}

// Remplace chaque {{clé}} connue du gabarit par sa valeur ; les clés inconnues restent intactes.
export function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
}
