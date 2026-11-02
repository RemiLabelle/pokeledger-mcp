import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie la section TDD livrée, sur une seule ligne pour ignorer les retours à la ligne du markdown.
function tddRules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["tdd"]).replace(/\s+/g, " ");
}

for (const [behavior, expected] of [
  ["seams are confirmed by the operator before any test", /Avant d'écrire le moindre test, l'agent DOIT .*faire confirmer par l'opérateur/],
  ["no test is written at an unconfirmed seam", /Aucun test NE DOIT être écrit à une couture non confirmée/],
  ["work proceeds in vertical slices", /une couture, un test, une implémentation minimale par cycle/],
  ["writing all the tests up front is forbidden", /NE DOIT PAS écrire tous les tests d'une tâche avant de les implémenter/],
  ["a slice's test fails before any production code", /DOIT vérifier qu'il échoue avant d'écrire du code de production/],
  ["each slice goes through operator validation", /Pour chaque tranche, .*`step: "validate_tests"`/],
  ["only the code needed to pass the test is written", /uniquement le code nécessaire pour faire passer le test/],
  ["tests stay immutable once committed", /les tests NE DOIVENT PLUS être modifiés/],
  ["coverage is 100% after the last slice", /À la fin de la dernière tranche, .*couverture de 100 % \(`npm run test:coverage`\)/],
  ["vanity tests stay forbidden", /NE DOIT PAS ajouter de test dans le seul but d'atteindre l'objectif de couverture/],
  ["refactoring stays out of the loop", /refactoring ne fait pas partie de la boucle/],
  ["tests go through public interfaces", /DOIT vérifier un comportement à travers une interface publique/],
  ["implementation-coupled tests are forbidden", /Test couplé à l'implémentation/],
  ["tautological tests are forbidden", /Test tautologique/],
  ["mocks are limited to system boundaries", /simuler \(mock\) .*qu'aux frontières du système/],
]) {
  test(`shipped TDD rules state that ${behavior}`, () => {
    assert.match(tddRules(), expected);
  });
}
