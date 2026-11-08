import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie les règles livrées sur les skills, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["skills"]).replace(/\s+/g, " ");
}

test("a backend change is reviewed with review_back before the task ends", () => {
  assert.match(rules(), /Avant de terminer une tâche qui modifie du code backend, l'agent DOIT appeler l'outil `review_back`/);
});

test("a frontend change is reviewed with review_front before the task ends", () => {
  assert.match(rules(), /Avant de terminer une tâche qui modifie du code frontend, l'agent DOIT appeler l'outil `review_front`/);
});

test("a change touching both sides calls both review tools", () => {
  assert.match(rules(), /Un changement qui touche les deux côtés DOIT passer par les deux outils/);
});

test("audits only run when the operator asks for them", () => {
  assert.match(rules(), /L'agent NE DOIT utiliser le paramètre `mode` que sur demande de l'opérateur/);
});

test("review findings are reported to the operator rather than fixed silently", () => {
  assert.match(rules(), /DOIT présenter le dossier de revue à l'opérateur avant toute correction/);
});
