import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie les sections livrées demandées, sur une seule ligne pour ignorer les retours à la ligne du markdown.
function rules(...sections) {
  return buildContext(DEFAULT_CONTEXT_DIR, sections).replace(/\s+/g, " ");
}

test("the governance rules are a section of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Gouvernance"));
});

test("the governance check runs before any implementation", () => {
  assert.match(rules("governance"), /Avant toute implémentation, l'agent DOIT produire un contrôle de gouvernance/);
});

for (const item of [
  "Objectif de la demande",
  "Défaut, risque ou bénéfice mesurable",
  "Évaluation du statu quo",
  "Contraintes d'architecture touchées",
  "Risques ou conflits",
  "Plus petit changement sûr",
  "Test d'acceptation",
]) {
  test(`the governance check covers "${item}"`, () => {
    assert.ok(rules("governance").includes(item));
  });
}

test("no change is a valid outcome when nothing justifies one", () => {
  const text = rules("governance");
  assert.match(text, /Ne rien changer est un résultat valide/);
  assert.match(text, /sans défaut, risque ou bénéfice concret, l'agent DOIT s'arrêter et recommander de ne rien changer/);
});

test("a cleanup or refactor request alone does not justify a change", () => {
  assert.match(rules("governance"), /NE DOIT PAS modifier du code au seul motif d'une demande de nettoyage/);
});

for (const category of ["A", "B", "C", "D"]) {
  test(`a cleanup is classified with category ${category}`, () => {
    assert.match(rules("governance"), new RegExp(`\\*\\*${category}\\*\\*`));
  });
}

test("architecture choices are compared to prior decisions and scope", () => {
  assert.match(rules("governance"), /pourquoi maintenant, avec quoi elle entre en conflit, ce qu'elle reporte, si elle élargit la portée/);
});

test("the agent pushes back on unjustified churn with a safer alternative", () => {
  assert.match(rules("governance"), /l'agent DOIT objecter brièvement, justifier l'objection et proposer une alternative plus sûre/);
});

test("the smallest safe change is offered first in choose_implementation", () => {
  assert.match(rules("decisions"), /le plus petit changement sûr issu du contrôle de gouvernance DOIT être proposé en premier/);
});

test("the governance rules credit the guv skill", () => {
  assert.ok(rules("governance").includes("https://tessl.io/registry/sporkwace/guv"));
});
