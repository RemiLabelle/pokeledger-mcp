import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const TOOL = "start_workflow";
const STEPS = ["validate_tests", "choose_implementation", "confirm_custom_implementation"];

let client;
let elicitations;

// Connecte un client de test qui annule toute élicitation et les enregistre.
async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: { form: {} } } });
  elicitations = [];
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    elicitations.push(request.params);
    return { action: "cancel" };
  });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("only ping and start_workflow are public tools", async () => {
  await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["ping", "start_workflow"]);
});

test("start_workflow offers every internal step", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === TOOL);
  assert.deepEqual([...tool.inputSchema.properties.step.enum].sort(), [...STEPS].sort());
});

test("an unknown step is rejected", async () => {
  await connect();
  const result = await client.callTool({ name: TOOL, arguments: { step: "push", input: {} } });
  assert.equal(result.isError, true);
  assert.equal(elicitations.length, 0);
});

for (const step of STEPS) {
  test(`the ${step} step without input is rejected before asking the operator`, async () => {
    await connect();
    const result = await client.callTool({ name: TOOL, arguments: { step } });
    assert.equal(result.isError, true);
    assert.equal(elicitations.length, 0);
  });
}

test("an invalid step input names the offending field", async () => {
  await connect();
  const result = await client.callTool({
    name: TOOL,
    arguments: { step: "validate_tests", input: { task: "Add a login form", scope: "Login" } },
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /cases/);
  assert.equal(elicitations.length, 0);
});

test("a step returns its result instead of the rules", async () => {
  await connect();
  const result = await client.callTool({
    name: TOOL,
    arguments: { step: "validate_tests", input: { task: "Add a login form", scope: "Login", cases: ["works"] } },
  });
  assert.equal(elicitations.length, 1);
  assert.equal(result.structuredContent.status, "not_validated");
});
