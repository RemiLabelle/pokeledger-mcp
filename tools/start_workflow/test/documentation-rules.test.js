import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONTEXT_DIR, buildContext } from "../context.js";

// Renvoie la section livrée sur la documentation, sur une seule ligne.
function rules() {
  return buildContext(DEFAULT_CONTEXT_DIR, ["documentation"]).replace(/\s+/g, " ");
}

test("the documentation rules are a section of the full context", () => {
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes("# Documentation"));
});

test("documentation goes through writing, content fix, then README humanising, in that order", () => {
  const text = rules();
  const writing = text.indexOf("## 1. Rédaction");
  const fix = text.indexOf("## 2. Correction du contenu");
  const humanise = text.indexOf("## 3. Humanisation du README");
  assert.ok(writing >= 0 && writing < fix && fix < humanise);
});

// Rédaction : markdown-authoring.
for (const [behavior, pattern] of [
  ["the document type is identified before applying a section order", /l'agent DOIT identifier le type de document/],
  ["code fences carry an explicit language", /bloc de code DOIT porter un langage explicite/],
  ["heading levels increase one at a time", /niveaux de titre NE DOIVENT PAS sauter de niveau/],
  ["list and table styles stay consistent", /un seul style de liste et un format de tableau homogène/],
  ["markdownlint runs until clean, with only narrow justified exceptions", /markdownlint .* jusqu'à zéro erreur/],
  ["broad lint rules are never disabled", /NE DOIT PAS désactiver une règle de lint de façon globale/],
]) {
  test(`writing rules: ${behavior}`, () => {
    assert.match(rules(), pattern);
  });
}

// Rédaction : mermaid-diagrams.
for (const [behavior, pattern] of [
  ["diagrams are written in Mermaid", /schémas DOIVENT être écrits en Mermaid/],
  ["the diagram type matches what it shows", /classDiagram.*sequenceDiagram.*flowchart.*erDiagram/],
  ["one diagram per concept", /un schéma par concept/],
]) {
  test(`diagram rules: ${behavior}`, () => {
    assert.match(rules(), pattern);
  });
}

// Rédaction : deep-research.
for (const [behavior, pattern] of [
  ["theoretical claims are backed by sources", /affirmation théorique DOIT être appuyée par au moins une source/],
  ["conflicting sources are called out", /sources en conflit DOIVENT être signalées avec les deux références/],
  ["no source, statistic or quote is invented", /NE DOIT PAS inventer de source, de statistique ou de citation/],
  ["sources are listed at the end", /section de références/],
]) {
  test(`research rules: ${behavior}`, () => {
    assert.match(rules(), pattern);
  });
}

// Correction du contenu : content-fix.
for (const [behavior, pattern] of [
  ["the content fix runs at the end of writing", /à la fin de la rédaction, l'agent DOIT relire et corriger le contenu/],
  ["only what is wrong is fixed", /ne corriger que ce qui est faux/],
  ["a fix that would change the meaning is skipped and reported", /correction qui changerait le sens .* DOIT être écartée et signalée/],
  ["the agent asks when unsure", /En cas de doute, l'agent DOIT demander à l'opérateur/],
  ["the content fix never pushes nor adds a co-author", /n'autorise ni push ni mention de co-auteur/],
]) {
  test(`content fix rules: ${behavior}`, () => {
    assert.match(rules(), pattern);
  });
}

// Humanisation : humaniser, sur le README seulement.
for (const [behavior, pattern] of [
  ["humanising applies to the README only", /s'applique uniquement au `README`/],
  ["humanising runs after the content fix", /après la correction du contenu/],
  ["it aims at a human contributor", /contributeur humain/],
  ["facts, names, numbers, quotes, URLs and the author's stance are preserved", /noms, dates, nombres, citations, URL .* position de l'auteur/],
  ["AI tells are hunted", /tics d'écriture d'IA/],
  ["a second audit pass looks for leftover tells", /seconde passe/],
  ["no fake specifics are added", /NE DOIT PAS ajouter de précision inventée/],
]) {
  test(`humaniser rules: ${behavior}`, () => {
    assert.match(rules(), pattern);
  });
}

for (const url of [
  "https://tessl.io/registry/pantheon-ai/markdown-authoring",
  "https://tessl.io/registry/skills/github/softaworks/agent-toolkit/mermaid-diagrams",
  "https://tessl.io/registry/skills/github/fernandezbaptiste/claude-code-skills/deep-research",
  "https://tessl.io/registry/skills/github/netwrix/docs/content-fix",
  "https://tessl.io/registry/oh-my-ai/humaniser",
]) {
  test(`the documentation rules credit ${url}`, () => {
    assert.ok(rules().includes(url));
  });
}
