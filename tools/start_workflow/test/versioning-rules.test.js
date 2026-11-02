import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

test("shipped versioning rules allow a red commit only for a slice's validated tests", () => {
  const rules = buildContext(DEFAULT_CONTEXT_DIR, ["versioning"]).replace(/\s+/g, " ");
  assert.match(rules, /Hormis le commit qui ajoute les tests validés d'une tranche/);
});
