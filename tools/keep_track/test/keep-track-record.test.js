import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const PREFERENCE = {
  action: "record",
  kind: "preference",
  lesson: "Use tabs",
  context: "Operator said: always use tabs",
};

let client;

// Crée un dossier de mémoire temporaire et vide.
function tempMemoryDir() {
  return mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
}

// Connecte un nouveau client de test à un nouveau serveur ; options est transmis à createServer.
async function connect(options) {
  await client?.close();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(options);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Appelle l'outil public keep_track.
function keepTrack(args) {
  return client.callTool({ name: "keep_track", arguments: args });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
  delete process.env.POKELEDGER_KEEP_TRACK_DIR;
});

test("keep_track is listed as a public tool", async () => {
  await connect({ memoryDir: tempMemoryDir() });
  const { tools } = await client.listTools();
  assert.ok(tools.some((t) => t.name === "keep_track"));
});

test("recall on an empty memory returns no entries", async () => {
  await connect({ memoryDir: tempMemoryDir() });
  const result = await keepTrack({ action: "recall" });
  assert.equal(result.structuredContent.status, "recalled");
  assert.deepEqual(result.structuredContent.entries, []);
});

test("a recorded preference is returned by recall with its source", async () => {
  await connect({ memoryDir: tempMemoryDir() });
  const recorded = await keepTrack(PREFERENCE);
  assert.equal(recorded.structuredContent.status, "recorded");

  const { entries } = (await keepTrack({ action: "recall" })).structuredContent;
  assert.equal(entries.length, 1);
  assert.equal(entries[0].lesson, "Use tabs");
  assert.equal(entries[0].kind, "preference");
  assert.equal(entries[0].context, "Operator said: always use tabs");
  assert.ok(!Number.isNaN(Date.parse(entries[0].recordedAt)));
});

test("recall also returns the entries as text for clients without structured content", async () => {
  await connect({ memoryDir: tempMemoryDir() });
  await keepTrack(PREFERENCE);
  const result = await keepTrack({ action: "recall" });
  assert.match(result.content[0].text, /Use tabs/);
});

test("memory survives a new server instance on the same directory", async () => {
  const memoryDir = tempMemoryDir();
  await connect({ memoryDir });
  await keepTrack(PREFERENCE);

  await connect({ memoryDir });
  const { entries } = (await keepTrack({ action: "recall" })).structuredContent;
  assert.deepEqual(entries.map((e) => e.lesson), ["Use tabs"]);
});

test("POKELEDGER_KEEP_TRACK_DIR selects the memory directory", async () => {
  const memoryDir = tempMemoryDir();
  process.env.POKELEDGER_KEEP_TRACK_DIR = memoryDir;
  await connect();
  await keepTrack(PREFERENCE);
  assert.ok(readdirSync(memoryDir).length > 0);
});

test("record without a lesson returns an error and stores nothing", async () => {
  const memoryDir = path.join(tempMemoryDir(), "unused");
  await connect({ memoryDir });
  const result = await keepTrack({ action: "record", kind: "preference" });
  assert.equal(result.isError, true);
  assert.equal(existsSync(memoryDir), false);
});
