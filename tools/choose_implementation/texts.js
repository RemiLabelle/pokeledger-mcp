import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TEXTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

const TEMPLATE_FILES = {
  toolDescription: "tool-description.md",
  request: "request.md",
  option: "option.md",
  chosen: "chosen.md",
  custom: "custom.md",
  incomplete: "incomplete.md",
  notChosen: "not-chosen.md",
  unavailable: "unavailable.md",
};

// Charge les gabarits de messages et les libellés du formulaire depuis le dossier de textes.
export function loadTexts(dir = DEFAULT_TEXTS_DIR) {
  const texts = {};
  for (const [key, file] of Object.entries(TEMPLATE_FILES)) {
    texts[key] = readFileSync(path.join(dir, file), "utf8").trim();
  }
  texts.strings = JSON.parse(readFileSync(path.join(dir, "strings.json"), "utf8"));
  return texts;
}

// Remplace chaque {{clé}} connue du gabarit par sa valeur ; les clés inconnues restent intactes.
export function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
}
