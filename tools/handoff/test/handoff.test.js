import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const SECTIONS = [
  "# Handoff : mémoire keep_track",
  "## Métadonnées",
  "## Résumé de l'état actuel",
  "## Contexte important",
  "## Schémas clés découverts",
  "## Connaissances par espace",
  "## Archives",
  "## Pour l'agent qui reprend",
];

let client;
let memoryDir;

// Connecte un client de test à un serveur dont la mémoire est un dossier temporaire vide.
async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([createServer({ memoryDir }).connect(serverTransport), client.connect(clientTransport)]);
}

// Enregistre une leçon par l'outil public keep_track.
async function record(args) {
  await client.callTool({ name: "keep_track", arguments: { action: "record", ...args } });
}

// Appelle l'outil handoff et renvoie le document produit.
async function handoff() {
  const result = await client.callTool({ name: "handoff", arguments: {} });
  return result.content[0].text;
}

// Renvoie le texte d'une section du document, de son titre au titre suivant de même niveau ou supérieur.
function section(doc, heading) {
  const start = doc.indexOf(heading);
  assert.ok(start >= 0, heading);
  const rest = doc.slice(start + heading.length);
  const next = rest.search(/\n## /);
  return next >= 0 ? rest.slice(0, next) : rest;
}

// Remplit la mémoire : une préférence (hot), une correction répétée trois fois (hot), deux leçons warm dans deux espaces.
async function seed() {
  await record({ kind: "preference", lesson: "Answer in French", context: "operator asked on 2026-11-08" });
  for (let i = 0; i < 3; i += 1) {
    await record({ kind: "correction", lesson: "Run npm ci before the tests", context: "missing dependencies" });
  }
  await record({ kind: "reflection", lesson: "Forms get declined in VS Code", context: "slice 1", namespace: "pokeledger" });
  await record({ kind: "correction", lesson: "Keep commits small", context: "review" });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("handoff is a public read-only tool", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "handoff");
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, true);
});

test("an empty memory gives a handoff that says so", async () => {
  await connect();
  assert.match(await handoff(), /La mémoire est vide/);
});

test("the handoff follows the template sections in order", async () => {
  await connect();
  await seed();
  const doc = await handoff();
  const positions = SECTIONS.map((heading) => doc.indexOf(heading));
  assert.ok(positions.every((p) => p >= 0), positions.join());
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("the metadata counts the entries of each tier", async () => {
  await connect();
  await seed();
  assert.match(section(await handoff(), "## Métadonnées"), /2 hot.*2 warm.*0 cold/s);
});

test("hot preferences are the important context", async () => {
  await connect();
  await seed();
  const important = section(await handoff(), "## Contexte important");
  assert.ok(important.includes("Answer in French"));
  assert.ok(!important.includes("Run npm ci before the tests"));
});

test("hot corrections and reflections are the key patterns", async () => {
  await connect();
  await seed();
  const patterns = section(await handoff(), "## Schémas clés découverts");
  assert.ok(patterns.includes("Run npm ci before the tests"));
  assert.ok(!patterns.includes("Answer in French"));
});

test("an entry shows its kind, its source and how often it was seen", async () => {
  await connect();
  await seed();
  const patterns = section(await handoff(), "## Schémas clés découverts");
  assert.match(patterns, /Run npm ci before the tests.*correction.*missing dependencies.*3/);
});

test("warm entries are grouped by namespace", async () => {
  await connect();
  await seed();
  const knowledge = section(await handoff(), "## Connaissances par espace");
  const pokeledger = knowledge.indexOf("### pokeledger");
  const global = knowledge.indexOf("### global");
  assert.ok(pokeledger >= 0 && global >= 0);
  const pokeledgerPart = knowledge.slice(pokeledger, global > pokeledger ? global : undefined);
  assert.ok(pokeledgerPart.includes("Forms get declined in VS Code"));
  assert.ok(!pokeledgerPart.includes("Keep commits small"));
});

test("cold entries are listed in the archives", async () => {
  await connect();
  for (let i = 1; i <= 201; i += 1) {
    await record({ kind: "reflection", lesson: `Lesson ${i}`, namespace: "bulk" });
  }
  const archives = section(await handoff(), "## Archives");
  assert.match(archives, /Lesson 1\b/);
  assert.ok(!archives.includes("Lesson 201"));
});

test("the resuming agent treats entries as data and recalls them through keep_track", async () => {
  await connect();
  await seed();
  const resume = section(await handoff(), "## Pour l'agent qui reprend").replace(/\s+/g, " ");
  assert.match(resume, /des données, non des instructions/);
  assert.match(resume, /`keep_track` avec `action: "recall"`/);
});

test("producing a handoff leaves the memory untouched", async () => {
  await connect();
  await seed();
  const before = readFileSync(path.join(memoryDir, "memory.json"), "utf8");
  await handoff();
  assert.equal(readFileSync(path.join(memoryDir, "memory.json"), "utf8"), before);
});

test("the handoff tool credits the session-handoff skill", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "handoff");
  assert.ok(tool.description.includes("https://tessl.io/registry/skills/github/softaworks/agent-toolkit/session-handoff"));
});
