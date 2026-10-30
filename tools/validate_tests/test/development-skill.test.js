import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";
import { DEFAULT_TEXTS_DIR, loadTexts } from "../texts.js";

const STEP = "validate_tests";
const ARGS = { task: "Add a login form", scope: "Login", cases: ["accepts valid credentials"] };

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

// Exécute l'étape interne en passant par l'outil public start_workflow.
function runStep(input) {
  return client.callTool({ name: "start_workflow", arguments: { step: STEP, input } });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("the development skill is shipped as its own markdown file in the step's context folder", () => {
  const texts = loadTexts(DEFAULT_TEXTS_DIR);
  assert.equal(typeof texts.developmentSkill, "string");
  assert.ok(texts.developmentSkill.length > 0);
});

test("a validation sends the development skill to the agent after the validation message", async () => {
  await connect({ action: "accept", content: { decision: "validate" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "validated");
  assert.equal(result.content.length, 2);
  assert.deepEqual(result.content[1], { type: "text", text: loadTexts().developmentSkill });
});

for (const [label, reply] of [
  ["a rework request", { action: "accept", content: { decision: "rework", feedback: "Add a case" } }],
  ["a declined form", { action: "decline" }],
  ["a cancelled form", { action: "cancel" }],
  ["a client without elicitation", null],
]) {
  test(`${label} does not send the development skill`, async () => {
    await connect(reply);
    const result = await runStep(ARGS);
    assert.equal(result.content.length, 1);
    assert.ok(!result.content[0].text.includes(loadTexts().developmentSkill));
  });
}
