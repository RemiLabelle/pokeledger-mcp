import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

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

// Appelle export_memory et renvoie le résultat complet.
function exportMemory() {
  return client.callTool({ name: "export_memory", arguments: {} });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("export_memory is a public read-only tool", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "export_memory");
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, true);
});

test("the export is a versioned pokeledger-memory JSON bundle", async () => {
  await connect();
  const bundle = JSON.parse((await exportMemory()).content[0].text);
  assert.equal(bundle.format, "pokeledger-memory");
  assert.equal(bundle.version, 1);
  assert.match(bundle.exportedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("an empty memory exports no entries", async () => {
  await connect();
  const bundle = JSON.parse((await exportMemory()).content[0].text);
  assert.deepEqual(bundle.entries, []);
});

test("every entry is exported with all its fields", async () => {
  await connect();
  await record({ kind: "preference", lesson: "Answer in French", context: "asked in chat", namespace: "pokeledger" });
  for (let i = 0; i < 2; i += 1) {
    await record({ kind: "correction", lesson: "Run npm ci first", context: "missing deps" });
  }
  const { entries } = JSON.parse((await exportMemory()).content[0].text);
  assert.equal(entries.length, 2);

  const preference = entries.find((e) => e.lesson === "Answer in French");
  assert.equal(preference.kind, "preference");
  assert.equal(preference.context, "asked in chat");
  assert.equal(preference.namespace, "pokeledger");
  assert.equal(preference.tier, "hot");
  assert.equal(preference.count, 1);
  assert.match(preference.recordedAt, /^\d{4}-\d{2}-\d{2}T/);

  const correction = entries.find((e) => e.lesson === "Run npm ci first");
  assert.equal(correction.namespace, "global");
  assert.equal(correction.tier, "warm");
  assert.equal(correction.count, 2);
});

test("the bundle is also returned as structured content", async () => {
  await connect();
  await record({ kind: "reflection", lesson: "Forms are declined in print mode" });
  const result = await exportMemory();
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
});

test("exporting leaves the memory untouched", async () => {
  await connect();
  await record({ kind: "preference", lesson: "Answer in French" });
  const before = readFileSync(path.join(memoryDir, "memory.json"), "utf8");
  await exportMemory();
  assert.equal(readFileSync(path.join(memoryDir, "memory.json"), "utf8"), before);
});
