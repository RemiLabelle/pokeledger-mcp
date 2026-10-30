import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

const SEPARATOR = "\n\n---\n\n";

// Détermine le dossier de contexte : POKELEDGER_START_WORKFLOW_CONTEXT_DIR s'il est défini, sinon le dossier livré.
export function resolveContextDir(env = process.env) {
  const dir = env.POKELEDGER_START_WORKFLOW_CONTEXT_DIR;
  return dir ? path.resolve(dir) : DEFAULT_CONTEXT_DIR;
}

// Lit un fichier du dossier de contexte et retire les espaces de début et de fin.
function readContextFile(dir, file) {
  return readFileSync(path.join(dir, file), "utf8").trim();
}

// Charge le manifeste qui décrit les sections et les textes du serveur.
export function loadManifest(dir) {
  return JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
}

// Assemble les sections demandées (toutes si la liste est vide) dans l'ordre du manifeste.
export function buildContext(dir, sectionIds = []) {
  const { sections } = loadManifest(dir);
  const known = sections.map((s) => s.id);
  const unknown = sectionIds.filter((id) => !known.includes(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown section(s): ${unknown.join(", ")}. Available: ${known.join(", ")}`);
  }

  const selected = sectionIds.length > 0 ? sections.filter((s) => sectionIds.includes(s.id)) : sections;
  return selected.map((s) => readContextFile(dir, s.file)).join(SEPARATOR);
}

// Lit les instructions du serveur et la description de l'outil déclarées dans le manifeste.
export function loadServerTexts(dir) {
  const { instructions, toolDescription } = loadManifest(dir);
  return {
    instructions: instructions ? readContextFile(dir, instructions) : undefined,
    toolDescription: toolDescription ? readContextFile(dir, toolDescription) : undefined,
  };
}
