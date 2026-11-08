import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const ARGS = { task: "Add an order endpoint", scope: "Orders", cases: ["creates an order"] };

let client;
let skill;

// Valide des tests par l'outil public et garde le skill de développement renvoyé, sur une seule ligne.
before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: { form: {} } } });
  client.setRequestHandler(ElicitRequestSchema, async () => ({ action: "accept", content: { decision: "validate" } }));
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name: "start_workflow", arguments: { step: "validate_tests", input: ARGS } });
  skill = result.content[1].text.replace(/\s+/g, " ");
});

after(async () => {
  await client.close();
});

// Base commune : software-design-principles.
for (const [behavior, pattern] of [
  ["a decision is classified as architectural, tactical or foundational", /architecturale, tactique ou fondamentale/],
  ["dependencies point inward without cycles", /dépendances DOIVENT pointer vers l'intérieur.*aucune dépendance circulaire/],
  ["SOLID is checked with a question and a refactor signal per principle", /SRP.*OCP.*LSP.*ISP.*DIP/],
  ["a pattern is only used when it removes a concrete current complexity", /patron NE DOIT être introduit que s'il résout un problème concret actuel/],
  ["no design for imagined future requirements", /NE DOIT PAS concevoir pour des besoins futurs imaginés/],
  ["no god classes or services", /classes ou services fourre-tout/],
  ["no optimisation before measurement", /NE DOIT PAS optimiser avant d'avoir mesuré/],
  ["no hard-coded configuration or secrets", /NE DOIT PAS coder en dur la configuration ou des secrets/],
  ["unknowns are typed as unknown rather than any", /`unknown`.*plutôt que `any`/],
  ["a used pattern stays identifiable by its name", /patron utilisé DOIT rester identifiable par son nom/],
]) {
  test(`the design base states that ${behavior}`, () => {
    assert.match(skill, pattern);
  });
}

test("the old abstraction-first rule is gone", () => {
  assert.doesNotMatch(skill, /L'abstraction DOIT être privilégiée/);
});

// Base commune : headless-architecture.
for (const [behavior, pattern] of [
  ["the core holds business logic and state without UI code", /cœur .* logique métier et l'état, sans aucun code d'interface/],
  ["the view only renders the view model and dispatches commands", /vue passive .* affiche le modèle de vue et envoie des commandes/],
  ["business-critical validation lives in the core", /validation critique pour le métier DOIT vivre dans le cœur/],
  ["the view receives DTOs, never internal objects", /DTO/],
  ["business logic requested inside a UI component is moved to the core", /logique métier dans un composant d'interface/],
]) {
  test(`the architecture base states that ${behavior}`, () => {
    assert.match(skill, pattern);
  });
}

// Surcouche backend : simple-typescript.
for (const [behavior, pattern] of [
  ["the backend overlay yields to local conventions", /conventions locales du projet restent prioritaires/],
  ["no class unless there is a strong reason", /pas de classe sans raison forte/],
  ["no factory, wrapper or trivial helper", /ni fabrique, ni enveloppe, ni fonction d'aide triviale/],
  ["duplication is preferred over a bad abstraction", /duplication plutôt qu'une mauvaise abstraction/],
  ["type is the default and interface is for public contracts", /`type` par défaut.*`interface`/],
  ["recoverable failures are tagged results", /union discriminée avec un champ `tag`/],
  ["untrusted data is validated once at the boundary", /valider une seule fois à la frontière/],
]) {
  test(`the backend overlay states that ${behavior}`, () => {
    assert.match(skill, pattern);
  });
}

// Surcouche backend : api-idempotency.
for (const [behavior, pattern] of [
  ["every resource-creating POST is idempotent", /Toute route POST qui crée une ressource ou déclenche un effet de bord DOIT être protégée/],
  ["the key comes in the Idempotency-Key header", /`Idempotency-Key`/],
  ["the key is locked before processing", /verrouiller la clé avant le traitement/],
  ["a concurrent duplicate gets 409", /409/],
  ["5xx responses are never cached", /réponses 5xx NE DOIVENT PAS être mises en cache/],
  ["4xx responses are cached with their original status", /réponses 4xx DOIVENT être mises en cache .* code d'origine/],
  ["each entry has a 24-hour expiry", /24 heures/],
  ["the key column is unique and only the duplicate error is caught", /contrainte d'unicité.*seule l'erreur de doublon/],
]) {
  test(`the idempotency overlay states that ${behavior}`, () => {
    assert.match(skill, pattern);
  });
}

test("the backend overlay only applies to backend code", () => {
  assert.match(skill, /Surcouche backend.*s'applique uniquement au code backend/);
});

for (const url of [
  "https://tessl.io/registry/pantheon-ai/software-design-principles",
  "https://tessl.io/registry/jpc0/headless-architecture",
  "https://tessl.io/registry/skills/github/idrevnii/perks/simple-typescript",
  "https://tessl.io/registry/tessl-labs/api-idempotency",
]) {
  test(`the development skill credits ${url}`, () => {
    assert.ok(skill.includes(url));
  });
}
