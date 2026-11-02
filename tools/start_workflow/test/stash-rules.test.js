import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie la section de versionnage livrée, sur une seule ligne pour ignorer les retours à la ligne du markdown.
function versioningRules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["versioning"]).replace(/\s+/g, " ");
}

test("shipped versioning rules stash unstaged or untracked changes at the start", () => {
  assert.match(
    versioningRules(),
    /modifications non indexées ou des fichiers non suivis.*l'agent DOIT les remiser au début de la tâche \(`git stash push --include-untracked`\)/,
  );
});

test("shipped versioning rules pop the stash at the end", () => {
  assert.match(versioningRules(), /DOIT les restaurer à la fin de la tâche \(`git stash pop`\)/);
});
