import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTEXT_DIR } from "./context.js";

const STYLE_FILE = path.join(DEFAULT_CONTEXT_DIR, "kawaii", "style.md");
const ODDS = 1 / 1000;

// Renvoie la consigne de style si le tirage réussit, sinon aucun texte.
export function rollKawaii(random) {
  return random() < ODDS ? [readFileSync(STYLE_FILE, "utf8").trim()] : [];
}
