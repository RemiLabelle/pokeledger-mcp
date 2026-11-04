import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTEXT_DIR } from "./context.js";

const STYLE_FILE = path.join(DEFAULT_CONTEXT_DIR, "kawaii", "style.md");
const ODDS = 1 / 1000;

// Crée l'état d'une session : renvoie la fonction qui effectue l'unique tirage et donne les textes à ajouter aux règles.
export function createKawaii(random) {
  let hit;
  // Tire au premier appel seulement ; renvoie la consigne de style si le tirage a réussi, sinon aucun texte.
  return function kawaiiTexts() {
    hit ??= random() < ODDS;
    return hit ? [readFileSync(STYLE_FILE, "utf8").trim()] : [];
  };
}
