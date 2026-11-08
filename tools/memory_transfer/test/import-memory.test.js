import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const clients = [];

// Connecte un nouveau client de test à un serveur dont la mémoire est un dossier temporaire vide.
async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([createServer({ memoryDir }).connect(serverTransport), client.connect(clientTransport)]);
  clients.push(client);
  return { client, memoryDir };
}

// Appelle un outil et renvoie le résultat complet.
function call(client, name, args = {}) {
  return client.callTool({ name, arguments: args });
}

// Exporte la mémoire d'un client et renvoie ses entrées.
async function exportedEntries(client) {
  return (await call(client, "export_memory")).structuredContent.entries;
}

// Construit un paquet d'import à partir d'entrées.
function bundle(entries, overrides = {}) {
  return JSON.stringify({ format: "pokeledger-memory", version: 1, exportedAt: "2026-11-08T10:00:00.000Z", entries, ...overrides });
}

// Construit une entrée complète de mémoire.
function entry(fields) {
  return { kind: "correction", context: "earlier session", namespace: "global", tier: "warm", count: 1, recordedAt: "2026-11-01T09:00:00.000Z", ...fields };
}

// Lit le fichier de mémoire tel qu'il est sur disque, ou null s'il n'existe pas.
function memoryFile(memoryDir) {
  const file = path.join(memoryDir, "memory.json");
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close()));
});

test("import_memory is a public tool that writes the memory", async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "import_memory");
  assert.ok(tool);
  assert.notEqual(tool.annotations?.readOnlyHint, true);
});

test("a bundle loads into an empty memory with every field kept", async () => {
  const { client } = await connect();
  const entries = [
    entry({ kind: "preference", lesson: "Answer in French", tier: "hot", namespace: "pokeledger" }),
    entry({ lesson: "Run npm ci first", count: 2 }),
  ];
  const result = await call(client, "import_memory", { bundle: bundle(entries) });
  assert.equal(result.structuredContent.status, "imported");
  assert.equal(result.structuredContent.added, 2);
  assert.equal(result.structuredContent.merged, 0);
  assert.deepEqual(await exportedEntries(client), entries);
});

test("the same lesson in the same namespace is merged and its counts add up", async () => {
  const { client } = await connect();
  await call(client, "keep_track", { action: "record", kind: "correction", lesson: "Run npm ci first" });
  const result = await call(client, "import_memory", { bundle: bundle([entry({ lesson: "  run NPM ci first ", count: 1 })]) });
  assert.equal(result.structuredContent.added, 0);
  assert.equal(result.structuredContent.merged, 1);
  const [merged] = await exportedEntries(client);
  assert.equal(merged.count, 2);
  assert.equal(merged.tier, "warm");
});

test("a merged lesson seen three times is promoted to hot", async () => {
  const { client } = await connect();
  await call(client, "keep_track", { action: "record", kind: "correction", lesson: "Run npm ci first" });
  await call(client, "import_memory", { bundle: bundle([entry({ lesson: "Run npm ci first", count: 2 })]) });
  const [merged] = await exportedEntries(client);
  assert.equal(merged.count, 3);
  assert.equal(merged.tier, "hot");
});

test("the same lesson in another namespace stays a separate entry", async () => {
  const { client } = await connect();
  await call(client, "keep_track", { action: "record", kind: "correction", lesson: "Run npm ci first" });
  const result = await call(client, "import_memory", { bundle: bundle([entry({ lesson: "Run npm ci first", namespace: "other" })]) });
  assert.equal(result.structuredContent.added, 1);
  assert.equal(result.structuredContent.merged, 0);
  assert.equal((await exportedEntries(client)).length, 2);
});

test("tier limits apply again after an import", async () => {
  const { client } = await connect();
  const entries = Array.from({ length: 205 }, (_, i) => entry({ lesson: `Lesson ${i + 1}`, namespace: "bulk" }));
  await call(client, "import_memory", { bundle: bundle(entries) });
  const { structuredContent } = await call(client, "keep_track", { action: "stats" });
  assert.deepEqual(structuredContent.tiers, { hot: 0, warm: 200, cold: 5 });
});

for (const [label, text] of [
  ["text that is not JSON", "not json {"],
  ["a bundle of another format", bundle([], { format: "something-else" })],
  ["a bundle of an unsupported version", bundle([], { version: 2 })],
  ["an entry without a lesson", bundle([entry({ lesson: undefined })])],
  ["an entry with an unknown tier", bundle([entry({ lesson: "x", tier: "lukewarm" })])],
]) {
  test(`${label} is rejected and leaves the memory untouched`, async () => {
    const { client, memoryDir } = await connect();
    await call(client, "keep_track", { action: "record", kind: "preference", lesson: "Answer in French" });
    const before = memoryFile(memoryDir);
    const result = await call(client, "import_memory", { bundle: text });
    assert.equal(result.isError, true);
    assert.equal(memoryFile(memoryDir), before);
  });
}

test("a memory exported from one session is restored in another", async () => {
  const { client: source } = await connect();
  await call(source, "keep_track", { action: "record", kind: "preference", lesson: "Answer in French", context: "chat" });
  for (let i = 0; i < 3; i += 1) {
    await call(source, "keep_track", { action: "record", kind: "correction", lesson: "Run npm ci first" });
  }
  await call(source, "keep_track", { action: "record", kind: "reflection", lesson: "Forms are declined", namespace: "pokeledger" });
  const exported = (await call(source, "export_memory")).content[0].text;

  const { client: target } = await connect();
  await call(target, "import_memory", { bundle: exported });
  assert.deepEqual(await exportedEntries(target), await exportedEntries(source));
});
