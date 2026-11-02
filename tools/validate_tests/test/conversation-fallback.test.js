import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const INPUT = { task: "Add a login form", scope: "Login", cases: ["accepts valid credentials"] };

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

// Exécute l'étape validate_tests et renvoie l'état structuré, seul contenu visible sur certains clients.
async function validate() {
  const result = await client.callTool({ name: "start_workflow", arguments: { step: "validate_tests", input: INPUT } });
  return result.structuredContent;
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

for (const action of ["decline", "cancel"]) {
  test(`a form answered with ${action} gives the agent what it needs to ask in the conversation`, async () => {
    await connect({ action });
    const result = await validate();
    assert.equal(result.status, "not_validated");
    assert.equal(result.action, action);
    assert.match(result.question, /Add a login form/);
    assert.match(result.question, /accepts valid credentials/);
    assert.match(result.instructions, /NE DOIT PAS commencer le développement/);
  });
}

test("a client without elicitation gets the question and instructions in structured content", async () => {
  await connect(null);
  const result = await validate();
  assert.equal(result.status, "unavailable");
  assert.match(result.question, /Add a login form/);
  assert.match(result.instructions, /NE DOIT PAS commencer le développement/);
});

test("a validation puts the development skill in structured content", async () => {
  await connect({ action: "accept", content: { decision: "validate" } });
  const result = await validate();
  assert.equal(result.status, "validated");
  assert.match(result.instructions, /committer les tests seuls/);
  assert.match(result.instructions, /# Skill : développement/);
});

test("a rework request puts its instructions in structured content", async () => {
  await connect({ action: "accept", content: { decision: "rework", feedback: "Add a case" } });
  const result = await validate();
  assert.equal(result.status, "rework");
  assert.match(result.instructions, /Add a case/);
});
