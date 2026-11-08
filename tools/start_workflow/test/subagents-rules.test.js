import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie la section livrée sur les sous-agents, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["subagents"]).replace(/\s+/g, " ");
}

test("the subagent rules are a section of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Développement par sous-agents"));
});

test("subagents are only used for a plan of mostly independent tasks", () => {
  assert.match(rules(), /plan d'implémentation dont les tâches sont pour la plupart indépendantes/);
});

test("each task goes to a fresh implementer subagent with its full text and context", () => {
  assert.match(rules(), /l'agent coordinateur DOIT confier chaque tâche à un nouveau sous-agent implémenteur, avec le texte complet de la tâche et son contexte/);
});

test("the implementer does not read the plan file", () => {
  assert.match(rules(), /NE DOIT PAS lui demander de lire le fichier du plan/);
});

test("the implementer applies every work rule, operator validation of tests included", () => {
  assert.match(rules(), /Le sous-agent implémenteur DOIT appliquer toutes les règles de travail, dont le workflow TDD et l'étape `validate_tests`/);
});

test("implementer questions are answered before it goes on", () => {
  assert.match(rules(), /DOIT répondre entièrement aux questions du sous-agent avant qu'il ne poursuive/);
});

test("spec compliance is reviewed before code quality", () => {
  assert.match(rules(), /revue de conformité à la spécification .* avant la revue de qualité/);
});

test("the code quality review goes through the review tools", () => {
  const text = rules();
  assert.match(text, /La revue de qualité DOIT passer par l'outil `review_back`, `review_front` ou les deux/);
});

test("review loops repeat until approval and block the next task", () => {
  const text = rules();
  assert.match(text, /jusqu'à approbation/);
  assert.match(text, /NE DOIT PAS passer à la tâche suivante tant qu'une revue a des problèmes ouverts/);
});

test("implementers never run in parallel", () => {
  assert.match(rules(), /NE DOIT PAS lancer plusieurs sous-agents implémenteurs en parallèle/);
});

test("a failed task goes to a fix subagent rather than a manual fix", () => {
  assert.match(rules(), /DOIT confier la correction à un sous-agent de correction plutôt que de corriger lui-même/);
});

test("subagents work on the branch from the versioning rules, without worktrees", () => {
  assert.match(rules(), /sur la branche de travail créée selon les règles de versionnage, sans worktree/);
});

test("the subagent rules credit the subagent-driven-development skill", () => {
  assert.ok(rules().includes("https://tessl.io/registry/skills/github/foryourhealth111-pixel/Vibe-Skills/subagent-driven-development"));
});
