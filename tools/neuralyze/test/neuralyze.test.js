import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

let client;

// Connecte un client de test ; reply fournit la réponse de l'opérateur, ou null pour un client sans élicitation.
async function connect(reply, memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"))) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ memoryDir });
  const capabilities = reply ? { elicitation: { form: {} } } : {};
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  if (reply) {
    client.setRequestHandler(ElicitRequestSchema, async () => reply);
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return memoryDir;
}

// Remplit la mémoire avec une leçon de chaque niveau atteignable sans dépasser les limites.
async function seedMemory() {
  await client.callTool({ name: "keep_track", arguments: { action: "record", kind: "preference", lesson: "Use tabs" } });
  await client.callTool({ name: "keep_track", arguments: { action: "record", kind: "correction", lesson: "Check spacing" } });
}

// Renvoie le nombre d'entrées par niveau, tel que le rapporte keep_track.
async function tiers() {
  const result = await client.callTool({ name: "keep_track", arguments: { action: "stats" } });
  return result.structuredContent.tiers;
}

// Appelle l'outil public neuralyze.
function neuralyze() {
  return client.callTool({ name: "neuralyze", arguments: {} });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("neuralyze is a public tool marked as destructive", async () => {
  await connect(null);
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "neuralyze");
  assert.equal(tool.annotations.destructiveHint, true);
});

test("a confirmed neuralyze wipes the whole memory and reports how many entries it removed", async () => {
  await connect({ action: "accept", content: { confirm: true } });
  await seedMemory();
  const result = await neuralyze();
  assert.equal(result.structuredContent.status, "wiped");
  assert.equal(result.structuredContent.removed, 2);
  assert.deepEqual(await tiers(), { hot: 0, warm: 0, cold: 0 });
});

test("a wipe survives a new server instance on the same directory", async () => {
  const memoryDir = await connect({ action: "accept", content: { confirm: true } });
  await seedMemory();
  await neuralyze();
  await client.close();

  await connect(null, memoryDir);
  assert.deepEqual(await tiers(), { hot: 0, warm: 0, cold: 0 });
});

test("a confirmed neuralyze on an empty memory removes nothing", async () => {
  await connect({ action: "accept", content: { confirm: true } });
  const result = await neuralyze();
  assert.equal(result.structuredContent.status, "wiped");
  assert.equal(result.structuredContent.removed, 0);
});

for (const [label, reply, status] of [
  ["an unticked confirmation", { action: "accept", content: { confirm: false } }, "not_confirmed"],
  ["a declined form", { action: "decline" }, "not_confirmed"],
  ["a cancelled form", { action: "cancel" }, "not_confirmed"],
  ["a client without elicitation", null, "unavailable"],
]) {
  test(`${label} leaves the memory untouched`, async () => {
    await connect(reply);
    await seedMemory();
    const result = await neuralyze();
    assert.equal(result.structuredContent.status, status);
    assert.deepEqual(await tiers(), { hot: 1, warm: 1, cold: 0 });
  });
}
