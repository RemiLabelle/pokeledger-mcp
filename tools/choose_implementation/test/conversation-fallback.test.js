import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const CHOOSE_INPUT = {
  decision: "Pick a cache",
  context: "Lookups are slow",
  options: [{ title: "In-memory map", rationale: "Simple", snippet: "new Map()" }],
};
const CONFIRM_INPUT = { decision: "Pick a cache", custom: "A global variable", problems: ["Hidden shared state"] };

let client;

// Connecte un client de test ; reply fournit la réponse de l'opérateur, ou null pour un client sans élicitation.
async function connect(reply) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const capabilities = reply ? { elicitation: { form: {} } } : {};
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  if (reply) {
    client.setRequestHandler(ElicitRequestSchema, async () => reply);
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Exécute une étape interne et renvoie l'état structuré, seul contenu visible sur certains clients.
async function runStep(step, input) {
  const result = await client.callTool({ name: "start_workflow", arguments: { step, input } });
  return result.structuredContent;
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

for (const action of ["decline", "cancel"]) {
  test(`choose_implementation answered with ${action} gives the agent the options to ask about`, async () => {
    await connect({ action });
    const result = await runStep("choose_implementation", CHOOSE_INPUT);
    assert.equal(result.status, "not_chosen");
    assert.equal(result.action, action);
    assert.match(result.question, /Pick a cache/);
    assert.match(result.question, /In-memory map/);
    assert.ok(result.instructions.length > 0);
  });

  test(`confirm_custom_implementation answered with ${action} gives the agent the problems to ask about`, async () => {
    await connect({ action });
    const result = await runStep("confirm_custom_implementation", CONFIRM_INPUT);
    assert.equal(result.status, "cancelled");
    assert.equal(result.action, action);
    assert.match(result.question, /Hidden shared state/);
    assert.ok(result.instructions.length > 0);
  });
}

test("choose_implementation without elicitation returns the question and instructions", async () => {
  await connect(null);
  const result = await runStep("choose_implementation", CHOOSE_INPUT);
  assert.equal(result.status, "unavailable");
  assert.match(result.question, /In-memory map/);
  assert.ok(result.instructions.length > 0);
});

test("confirm_custom_implementation without elicitation returns the question and instructions", async () => {
  await connect(null);
  const result = await runStep("confirm_custom_implementation", CONFIRM_INPUT);
  assert.equal(result.status, "unavailable");
  assert.match(result.question, /Hidden shared state/);
  assert.ok(result.instructions.length > 0);
});

test("a chosen option puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { choice: "1" } });
  const result = await runStep("choose_implementation", CHOOSE_INPUT);
  assert.equal(result.status, "chosen");
  assert.match(result.instructions, /In-memory map/);
});

test("a custom implementation puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { choice: "custom", custom: "Use Redis" } });
  const result = await runStep("choose_implementation", CHOOSE_INPUT);
  assert.equal(result.status, "custom");
  assert.match(result.instructions, /Use Redis/);
});

test("an empty custom implementation puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { choice: "custom", custom: " " } });
  const result = await runStep("choose_implementation", CHOOSE_INPUT);
  assert.equal(result.status, "incomplete");
  assert.ok(result.instructions.length > 0);
});

test("proceeding with a custom implementation puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { choice: "proceed" } });
  const result = await runStep("confirm_custom_implementation", CONFIRM_INPUT);
  assert.equal(result.status, "proceed");
  assert.match(result.instructions, /A global variable/);
});

test("cancelling a custom implementation from the form puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { choice: "cancel" } });
  const result = await runStep("confirm_custom_implementation", CONFIRM_INPUT);
  assert.equal(result.status, "cancelled");
  assert.equal(result.action, "accept");
  assert.ok(result.instructions.length > 0);
});
