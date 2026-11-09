import { askOperatorForm } from "../operator_form/index.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTEXT_DIR } from "./context.js";

const TEXTS_DIR = path.join(DEFAULT_CONTEXT_DIR, "issue-number");
const MAX_ATTEMPTS = 3;
const NONE = "none";
const BRANCH_KEY = /P2A26E2-([1-9]\d*)/i;
const ANSWER = /^(?:P2A26E2-)?([1-9]\d*)$/i;
const NONE_ANSWERS = new Set(["aucune", "aucun", "none"]);

// Lit un texte de la question sur l'issue et retire les espaces de début et de fin.
function readText(file) {
  return readFileSync(path.join(TEXTS_DIR, file), "utf8").trim();
}

// Remplace chaque {clé} du texte par la valeur correspondante.
function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

// Extrait de la branche active le numéro d'issue qu'elle contient ; renvoie undefined s'il n'y en a pas.
export function proposeFromBranch(branch) {
  return branch?.match(BRANCH_KEY)?.[1];
}

// Traduit la saisie de l'opérateur en numéro d'issue ou en "none" ; renvoie undefined si elle est invalide.
export function parseAnswer(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (NONE_ANSWERS.has(value.toLowerCase())) {
    return NONE;
  }
  return value.match(ANSWER)?.[1];
}

// Construit le formulaire présenté à l'opérateur : un champ texte prérempli par la proposition éventuelle.
function operatorForm(strings, proposal) {
  const issue = { type: "string", title: strings.issueTitle, description: strings.issueDescription, minLength: 1 };
  if (proposal) {
    issue.default = proposal;
  }
  return { type: "object", properties: { issue }, required: ["issue"] };
}

// Compose le message du formulaire, précédé d'un rappel d'erreur après une saisie invalide.
function formMessage(strings, branch, proposal, retry) {
  const parts = [readText("request.md")];
  if (proposal) {
    parts.push(fill(strings.proposal, { branch, number: proposal }));
  }
  if (retry) {
    parts.unshift(readText("invalid.md"));
  }
  return parts.join("\n\n");
}

// Demande le numéro d'issue jusqu'à obtenir une saisie valide ; renvoie undefined sans réponse exploitable.
async function askOperator(server, branch) {
  const strings = JSON.parse(readText("strings.json"));
  const proposal = proposeFromBranch(branch);
  const requestedSchema = operatorForm(strings, proposal);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let answer;
    try {
      answer = await askOperatorForm(server, { message: formMessage(strings, branch, proposal, attempt > 0), requestedSchema });
    } catch {
      return undefined;
    }
    if (answer.action !== "accept") {
      return undefined;
    }
    const issue = parseAnswer(answer.content?.issue);
    if (issue) {
      return issue;
    }
  }
  return undefined;
}

// Traduit le paramètre issueNumber en réponse de l'opérateur ; renvoie undefined s'il est absent.
function fromParameter(issueNumber) {
  return issueNumber === undefined ? undefined : String(issueNumber);
}

// Donne la règle transmise à l'agent pour l'issue retenue.
function ruleFor(issue) {
  return issue === NONE ? readText("none.md") : fill(readText("rule.md"), { number: issue });
}

// Crée l'état d'une session : renvoie la fonction qui obtient le numéro d'issue ou lève une erreur sans réponse.
export function createIssueNumber(server) {
  let issue;
  // Renvoie la règle sur l'issue ; une réponse conservée prime sur le paramètre, qui évite lui-même le formulaire.
  return async function issueRule({ branch, issueNumber }) {
    issue ??= fromParameter(issueNumber) ?? (await askOperator(server, branch));
    if (issue === undefined) {
      throw new Error(readText("ask-in-conversation.md"));
    }
    return ruleFor(issue);
  };
}
