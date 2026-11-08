import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie les règles livrées sur les formulaires, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["forms"]).replace(/\s+/g, " ");
}

test("decline stays a valid operator answer that is confirmed once and then respected", () => {
  const text = rules();
  assert.match(text, /`decline` est une réponse valide de l'opérateur/);
  assert.match(text, /NE DOIT PAS le considérer comme une acceptation/);
  assert.match(text, /DOIT demander une seule fois/);
  assert.match(text, /NE DOIT PAS reposer la question/);
});

test("cancel and unavailable are not answers, so the agent asks the same question and waits", () => {
  const text = rules();
  assert.match(text, /`cancel` et `unavailable` ne sont pas des réponses/);
  assert.match(text, /DOIT poser la même question dans la conversation et attendre/);
  assert.match(text, /outil de question/);
});

test("neuralyze accepts only its form", () => {
  assert.match(rules(), /`neuralyze` n'accepte que son formulaire/);
});

test("a subagent hands form steps back to the main agent", () => {
  assert.match(rules(), /Un sous-agent NE DOIT PAS lancer d'étape à formulaire/);
});

test("the forms rules are part of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Formulaires de l'opérateur"));
});
