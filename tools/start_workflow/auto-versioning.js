import { askOperatorForm } from "../operator_form/index.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTEXT_DIR } from "./context.js";
import { createIssueNumber } from "./issue-number.js";

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
    const answer = await askOperatorForm(server, { message: readText("request.md"), requestedSchema: operatorForm(strings) });
    return answer.content?.autoVersioning;
  } catch {
    return undefined;
  }
}

// Choisit les textes à transmettre à l'agent selon la réponse de l'opérateur, qui peut être absente ; un oui exige la règle sur l'issue.
function textsFor(answer, rules, issueRule) {
  if (answer === "no") {
    return [readText("warning.md"), rules];
  }
  return answer === "yes" ? [rules, issueRule] : [rules, readText("ask-in-conversation.md")];
}

// Traduit le paramètre autoVersioning en réponse de l'opérateur ; renvoie undefined s'il est absent.
function fromParameter(autoVersioning) {
  if (autoVersioning === undefined) {
    return undefined;
  }
  return autoVersioning ? "yes" : "no";
}

// Crée l'état d'une session : renvoie la fonction qui interroge l'opérateur jusqu'à obtenir une réponse et donne les textes pour l'agent.
export function createAutoVersioning(server) {
  let answer;
  const issueRule = createIssueNumber(server);
  // Renvoie les textes pour l'agent ; une réponse conservée prime sur le paramètre, qui évite lui-même le formulaire. Après un oui, le numéro d'issue est exigé.
  return async function applyAutoVersioning(rules, { autoVersioning, branch, issueNumber } = {}) {
    answer ??= fromParameter(autoVersioning) ?? (await askOperator(server));
    const issue = answer === "yes" ? await issueRule({ branch, issueNumber }) : undefined;
    return textsFor(answer, rules, issue);
  };
}
