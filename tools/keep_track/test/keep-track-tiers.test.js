import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

let client;

// Connecte un client de test à un serveur dont la mémoire est un dossier temporaire vide.
async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
  const server = createServer({ memoryDir });
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Enregistre une leçon et renvoie l'entrée obtenue.
async function record(args) {
  const result = await client.callTool({ name: "keep_track", arguments: { action: "record", ...args } });
  return result.structuredContent.entry;
}

// Rappelle des entrées et renvoie leurs leçons.
async function recall(args = {}) {
  const result = await client.callTool({ name: "keep_track", arguments: { action: "recall", ...args } });
  return result.structuredContent.entries.map((e) => e.lesson);
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("a preference goes straight to the hot tier", async () => {
  await connect();
  const entry = await record({ kind: "preference", lesson: "Use tabs" });
  assert.equal(entry.tier, "hot");
  assert.deepEqual(await recall(), ["Use tabs"]);
});

for (const kind of ["correction", "reflection"]) {
  test(`a ${kind} starts in the warm tier and is left out of the default recall`, async () => {
    await connect();
    const entry = await record({ kind, lesson: "Check spacing" });
    assert.equal(entry.tier, "warm");
    assert.equal(entry.count, 1);
    assert.deepEqual(await recall(), []);
  });
}

test("record without a kind returns an error", async () => {
  await connect();
  const result = await client.callTool({ name: "keep_track", arguments: { action: "record", lesson: "Use tabs" } });
  assert.equal(result.isError, true);
});

test("a namespace recall adds that namespace's warm entries to the hot tier", async () => {
  await connect();
  await record({ kind: "preference", lesson: "Use tabs" });
  await record({ kind: "correction", lesson: "Deploy via CI", namespace: "my-app" });
  await record({ kind: "correction", lesson: "Use Postgres", namespace: "other-app" });
  assert.deepEqual(await recall({ namespace: "my-app" }), ["Use tabs", "Deploy via CI"]);
});

test("a lesson without a namespace is stored in the global namespace", async () => {
  await connect();
  const entry = await record({ kind: "correction", lesson: "Check spacing" });
  assert.equal(entry.namespace, "global");
  assert.deepEqual(await recall({ namespace: "global" }), ["Check spacing"]);
});

test("a lesson recorded twice stays warm and counts two repeats", async () => {
  await connect();
  await record({ kind: "correction", lesson: "Check spacing" });
  const entry = await record({ kind: "correction", lesson: "Check spacing" });
  assert.equal(entry.tier, "warm");
  assert.equal(entry.count, 2);
});

test("a lesson recorded three times is promoted to the hot tier", async () => {
  await connect();
  await record({ kind: "correction", lesson: "Check spacing" });
  await record({ kind: "correction", lesson: "Check spacing" });
  const entry = await record({ kind: "correction", lesson: "Check spacing" });
  assert.equal(entry.tier, "hot");
  assert.equal(entry.count, 3);
  assert.deepEqual(await recall(), ["Check spacing"]);
});

test("repeats ignore case and surrounding spaces", async () => {
  await connect();
  await record({ kind: "correction", lesson: "Check spacing" });
  const entry = await record({ kind: "correction", lesson: "  check SPACING " });
  assert.equal(entry.count, 2);
});

test("the same lesson in two namespaces counts separately", async () => {
  await connect();
  await record({ kind: "correction", lesson: "Check spacing", namespace: "a" });
  const entry = await record({ kind: "correction", lesson: "Check spacing", namespace: "b" });
  assert.equal(entry.count, 1);
});

test("a query searches every namespace and ignores case", async () => {
  await connect();
  await record({ kind: "correction", lesson: "Deploy via CI", namespace: "my-app" });
  await record({ kind: "correction", lesson: "Use tabs", namespace: "other-app" });
  assert.deepEqual(await recall({ query: "deploy" }), ["Deploy via CI"]);
});
