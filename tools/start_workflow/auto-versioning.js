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

// Demande à l'opérateur si l'agent doit versionner automatiquement ; renvoie sa réponse, ou undefined s'il n'y en a pas.
async function askOperator(server) {
  const strings = JSON.parse(readText("strings.json"));
  try {
    const answer = await server.server.elicitInput({ message: readText("request.md"), requestedSchema: operatorForm(strings) });
    return answer.content?.autoVersioning;
  } catch {
    return undefined;
  }
}

// Crée l'état d'une session : renvoie la fonction qui interroge l'opérateur une seule fois et donne les textes à transmettre à l'agent.
export function createAutoVersioning(server) {
  let answer;
  // Renvoie les règles, précédées de l'avertissement en cas de refus, en n'interrogeant l'opérateur que sans réponse conservée.
  return async function applyAutoVersioning(rules) {
    answer ??= await askOperator(server);
    return answer === "no" ? [readText("warning.md"), rules] : [rules];
  };
}
