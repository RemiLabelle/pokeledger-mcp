import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie la section livrée sur la communication, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["communication"]).replace(/\s+/g, " ");
}

test("the communication rules are a section of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Communication"));
});

test("the compressed style only applies to the agent's chat replies", () => {
  assert.match(rules(), /Le style compressé s'applique uniquement aux réponses de l'agent dans la conversation/);
});

test("articles, filler, pleasantries and hedging are dropped", () => {
  assert.match(rules(), /l'agent DOIT supprimer le remplissage, les formules de politesse et les précautions oratoires/);
});

test("technical terms stay exact and errors are quoted verbatim", () => {
  const text = rules();
  assert.match(text, /termes techniques DOIVENT rester exacts/);
  assert.match(text, /messages d'erreur DOIVENT être cités tels quels/);
});

test("replies follow the thing, action, reason, next step pattern", () => {
  assert.ok(rules().includes("[chose] [action] [raison]. [étape suivante]."));
});

for (const level of ["lite", "full", "ultra"]) {
  test(`the ${level} intensity level is described`, () => {
    assert.match(rules(), new RegExp(`\\*\\*${level}\\*\\*`));
  });
}

test("full is the default level and it persists until changed", () => {
  assert.match(rules(), /Le niveau par défaut est `full`/);
  assert.match(rules(), /reste actif sur chaque réponse/);
});

test("the operator can turn the style off", () => {
  assert.match(rules(), /« stop caveman » ou « mode normal »/);
});

for (const [label, pattern] of [
  ["code, commits and PRs", /code, les messages de commit, les descriptions de pull request/],
  ["documentation", /la documentation/],
  ["operator forms", /les messages des formulaires de l'opérateur/],
]) {
  test(`${label} stay in normal prose`, () => {
    assert.match(rules(), pattern);
  });
}

test("security warnings and irreversible confirmations switch back to clear prose", () => {
  assert.match(rules(), /avertissements de sécurité, les confirmations d'actions irréversibles/);
});

test("a confused operator gets a clear answer before the style resumes", () => {
  assert.match(rules(), /lorsque l'opérateur demande une clarification ou répète une question/);
});

test("the communication rules credit the caveman skill", () => {
  assert.ok(rules().includes("https://tessl.io/registry/skills/github/anthonystepvoy/caveman-opencode/caveman"));
});
