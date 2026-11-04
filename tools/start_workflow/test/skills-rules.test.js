import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie les règles livrées sur les skills, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["skills"]).replace(/\s+/g, " ");
}

test("a task the devops skill can improve requires loading it before any change", () => {
  assert.match(rules(), /l'agent DOIT charger le skill `devops` avant toute modification/);
});

for (const trigger of ["Docker", "CI/CD", "GitOps", "Kubernetes", "Helm", "Cloudflare", "Google Cloud", "audit de sécurité"]) {
  test(`${trigger} is a trigger for the devops skill`, () => {
    assert.ok(rules().includes(trigger));
  });
}

test("a task outside these areas does not require the skill", () => {
  assert.match(rules(), /Une tâche sans lien avec ces domaines ne l'exige pas/);
});

test("the agent reports a missing skill to the operator", () => {
  assert.match(rules(), /Si ce skill n'est pas installé, l'agent DOIT le signaler à l'opérateur/);
});

test("loading the skill never overrides the rules or authorises deployments and scripts", () => {
  const text = rules();
  assert.match(text, /Les règles de travail restent prioritaires sur ce skill/);
  assert.match(text, /déployer, modifier une infrastructure ou exécuter les scripts du skill sans demande explicite de l'opérateur/);
});

test("the skills rules are part of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Skills"));
});
