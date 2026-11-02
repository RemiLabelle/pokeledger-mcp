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
async function connect(reply) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
  const server = createServer({ memoryDir });
  const capabilities = reply ? { elicitation: { form: {} } } : {};
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  if (reply) {
    client.setRequestHandler(ElicitRequestSchema, async () => reply);
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Appelle neuralyze et renvoie son état structuré, seul contenu visible sur certains clients.
async function neuralyze() {
  return (await client.callTool({ name: "neuralyze", arguments: {} })).structuredContent;
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

for (const action of ["decline", "cancel"]) {
  test(`a form answered with ${action} tells the agent to send the operator to a terminal session`, async () => {
    await connect({ action });
    const result = await neuralyze();
    assert.equal(result.status, "not_confirmed");
    assert.equal(result.action, action);
    assert.match(result.instructions, /session `claude` dans un terminal/);
  });
}

test("a client without elicitation tells the agent to send the operator to a terminal session", async () => {
  await connect(null);
  const result = await neuralyze();
  assert.equal(result.status, "unavailable");
  assert.match(result.instructions, /session `claude` dans un terminal/);
});

test("the instructions forbid treating an answer in the conversation as confirmation", async () => {
  await connect({ action: "decline" });
  const result = await neuralyze();
  assert.match(result.instructions, /NE DOIT PAS considérer une réponse donnée dans la conversation comme une confirmation/);
});
