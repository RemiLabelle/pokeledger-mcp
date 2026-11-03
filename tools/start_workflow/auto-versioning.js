import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTEXT_DIR } from "./context.js";

const TEXTS_DIR = path.join(DEFAULT_CONTEXT_DIR, "auto-versioning");

// Lit un texte du versionnage automatique et retire les espaces de début et de fin.
function readText(file) {
  return readFileSync(path.join(TEXTS_DIR, file), "utf8").trim();
}

// Construit le formulaire présenté à l'opérateur : un choix entre oui et non.
function operatorForm(strings) {
  return {
    type: "object",
    properties: {
      autoVersioning: {
        type: "string",
        title: strings.choiceTitle,
        enum: ["yes", "no"],
        enumNames: [strings.yes, strings.no],
      },
    },
    required: ["autoVersioning"],
  };
}

// Demande à l'opérateur si l'agent doit versionner automatiquement pendant cette session.
export async function askAutoVersioning(server) {
  const strings = JSON.parse(readText("strings.json"));
  try {
    await server.server.elicitInput({ message: readText("request.md"), requestedSchema: operatorForm(strings) });
  } catch {
    // Un client sans élicitation ne bloque pas le chargement des règles.
  }
}
