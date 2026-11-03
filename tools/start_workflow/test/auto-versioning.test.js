import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "context-full");
const RULES = "# Alpha\n\nAlpha rule.\n\n---\n\n# Beta\n\nBeta rule.";

let client;
let questions;

// Connecte un client de test dont l'opérateur simulé répond toujours par reply ; les questions reçues sont conservées.
async function connect(reply) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ contextDir: FIXTURE });
  questions = [];
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: { form: {} } } });
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    questions.push(request.params);
    return reply;
  });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Charge les règles de travail par start_workflow avec les arguments donnés.
async function load(args = {}) {
  return client.callTool({ name: "start_workflow", arguments: args });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("loading the rules asks the operator a yes or no question and a yes returns the rules unchanged", async () => {
  await connect({ action: "accept", content: { autoVersioning: "yes" } });
  const result = await load();
  assert.equal(questions.length, 1);
  assert.match(questions[0].message, /versionner automatiquement/);
  assert.deepEqual(questions[0].requestedSchema.properties.autoVersioning.enum, ["yes", "no"]);
  assert.deepEqual(result.content, [{ type: "text", text: RULES }]);
});

test("a no answer returns a major warning before the unchanged rules", async () => {
  await connect({ action: "accept", content: { autoVersioning: "no" } });
  const result = await load();
  assert.equal(result.content.length, 2);
  const warning = result.content[0].text.replace(/\s+/g, " ");
  assert.match(warning, /AVERTISSEMENT MAJEUR/);
  assert.match(warning, /dans cette session, l'opérateur est responsable du respect des conventions Git/i);
  assert.match(warning, /L'agent NE DOIT PAS remiser, créer de branche ni committer/);
  assert.deepEqual(result.content[1], { type: "text", text: RULES });
});

for (const [answer, blocks] of [["yes", 1], ["no", 2]]) {
  test(`a ${answer} answer is kept for the session without asking again`, async () => {
    await connect({ action: "accept", content: { autoVersioning: answer } });
    await load();
    const second = await load();
    assert.equal(questions.length, 1);
    assert.equal(second.content.length, blocks);
  });
}

test("each server starts a new session that asks again", async () => {
  await connect({ action: "accept", content: { autoVersioning: "no" } });
  await load();
  await client.close();
  await connect({ action: "accept", content: { autoVersioning: "yes" } });
  await load();
  assert.equal(questions.length, 1);
});

test("a workflow step does not ask the operator about auto versioning", async () => {
  await connect({ action: "accept", content: { autoVersioning: "yes" } });
  const result = await load({ step: "validate_tests", input: {} });
  assert.equal(result.isError, true);
  assert.equal(questions.length, 0);
});

test("unknown sections do not ask the operator about auto versioning", async () => {
  await connect({ action: "accept", content: { autoVersioning: "yes" } });
  const result = await load({ sections: ["zzz"] });
  assert.equal(result.isError, true);
  assert.equal(questions.length, 0);
});
