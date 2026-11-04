import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie les règles livrées sur les skills, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["skills"]).replace(/\s+/g, " ");
}

test("a devops task must load the skill through the devops tool in automatic mode", () => {
  assert.match(rules(), /l'agent DOIT appeler l'outil `devops` avec `trigger: "automatic"` dès le début de la tâche/);
});

test("an automatic load requires the notice to the operator", () => {
  assert.match(rules(), /l'agent DOIT afficher à l'opérateur le message renvoyé par l'outil/);
});

test("a direct request for the skill uses the direct mode without any notice", () => {
  const text = rules();
  assert.match(text, /Si l'opérateur demande directement le skill, l'agent DOIT appeler l'outil `devops` sans `trigger`/);
  assert.match(text, /l'appliquer sans en notifier l'opérateur/);
});

test("the skill is provided by the server rather than installed by the client", () => {
  assert.match(rules(), /Ce skill est fourni par le serveur/);
});
