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

// Appelle l'outil public keep_track et renvoie son état structuré.
async function keepTrack(args) {
  return (await client.callTool({ name: "keep_track", arguments: args })).structuredContent;
}

// Enregistre count leçons distinctes numérotées à partir de 1.
async function recordMany(count, args) {
  for (let i = 1; i <= count; i += 1) {
    await keepTrack({ action: "record", lesson: `Lesson ${i}`, ...args });
  }
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("stats on an empty memory report zero in every tier", async () => {
  await connect();
  const stats = await keepTrack({ action: "stats" });
  assert.equal(stats.status, "stats");
  assert.deepEqual(stats.tiers, { hot: 0, warm: 0, cold: 0 });
});

test("stats count the entries of each tier", async () => {
  await connect();
  await recordMany(2, { kind: "preference" });
  await keepTrack({ action: "record", kind: "correction", lesson: "Check spacing" });
  const stats = await keepTrack({ action: "stats" });
  assert.deepEqual(stats.tiers, { hot: 2, warm: 1, cold: 0 });
});

test("the 101st hot entry demotes the oldest one to warm", async () => {
  await connect();
  await recordMany(101, { kind: "preference" });
  const stats = await keepTrack({ action: "stats" });
  assert.deepEqual(stats.tiers, { hot: 100, warm: 1, cold: 0 });
  const { entries } = await keepTrack({ action: "recall" });
  assert.ok(!entries.some((e) => e.lesson === "Lesson 1"));
  assert.equal(entries.length, 100);
});

test("hot overflow demotes a promoted correction before an older preference", async () => {
  await connect();
  await keepTrack({ action: "record", kind: "preference", lesson: "Keep me" });
  for (let i = 0; i < 3; i += 1) {
    await keepTrack({ action: "record", kind: "correction", lesson: "Promoted" });
  }
  await recordMany(99, { kind: "preference" });
  const { entries } = await keepTrack({ action: "recall" });
  assert.ok(entries.some((e) => e.lesson === "Keep me"));
  assert.ok(!entries.some((e) => e.lesson === "Promoted"));
});

test("the 201st warm entry of a namespace archives the oldest one to cold", async () => {
  await connect();
  await recordMany(201, { kind: "correction", namespace: "my-app" });
  const stats = await keepTrack({ action: "stats" });
  assert.deepEqual(stats.tiers, { hot: 0, warm: 200, cold: 1 });
  const { entries } = await keepTrack({ action: "recall", namespace: "my-app" });
  assert.ok(!entries.some((e) => e.lesson === "Lesson 1"));
});

test("warm limits apply to each namespace separately", async () => {
  await connect();
  await recordMany(200, { kind: "correction", namespace: "a" });
  await recordMany(1, { kind: "correction", namespace: "b" });
  const stats = await keepTrack({ action: "stats" });
  assert.deepEqual(stats.tiers, { hot: 0, warm: 201, cold: 0 });
});

test("cold entries stay reachable by query only", async () => {
  await connect();
  await recordMany(201, { kind: "correction", namespace: "my-app" });
  const { entries } = await keepTrack({ action: "recall", query: "Lesson 1" });
  const archived = entries.find((e) => e.lesson === "Lesson 1");
  assert.equal(archived.tier, "cold");
});
