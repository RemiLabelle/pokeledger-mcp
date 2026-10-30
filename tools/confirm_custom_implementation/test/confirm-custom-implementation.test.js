import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";
import { loadTexts, renderTemplate } from "../texts.js";

const TOOL = "confirm_custom_implementation";
const texts = loadTexts();
const ARGS = {
  decision: "Dispatch events to handlers",
  custom: "Store handlers in a global mutable object",
  problems: ["Introduces global mutable state", "Diverges from the Map registry used elsewhere"],
};

let client;
let elicitations;

// Connecte un client de test ; reply fournit la réponse de l'opérateur, ou null pour un client sans élicitation.
async function connect(reply) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const capabilities = reply ? { elicitation: { form: {} } } : {};
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  elicitations = [];
  if (reply) {
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      elicitations.push(request.params);
      return reply;
    });
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("tool is listed with the description from its context files", async () => {
  await connect({ action: "cancel" });
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === TOOL);
  assert.ok(tool);
  assert.equal(tool.description, texts.toolDescription);
  assert.deepEqual(tool.inputSchema.required.sort(), ["custom", "decision", "problems"]);
});

test("the operator receives the decision, the custom implementation and its problems", async () => {
  await connect({ action: "cancel" });
  await client.callTool({ name: TOOL, arguments: ARGS });
  assert.equal(elicitations.length, 1);
  assert.equal(
    elicitations[0].message,
    renderTemplate(texts.request, {
      decision: ARGS.decision,
      custom: ARGS.custom,
      problems: "- Introduces global mutable state\n- Diverges from the Map registry used elsewhere",
    }),
  );
});

test("the operator form asks to proceed knowingly or cancel", async () => {
  await connect({ action: "cancel" });
  await client.callTool({ name: TOOL, arguments: ARGS });
  const schema = elicitations[0].requestedSchema;
  assert.deepEqual(schema.required, ["choice"]);
  assert.deepEqual(schema.properties.choice.enum, ["proceed", "cancel"]);
  assert.deepEqual(schema.properties.choice.enumNames, [
    texts.strings.proceedLabel,
    texts.strings.cancelLabel,
  ]);
});

test("proceeding tells the agent to implement the custom choice as is", async () => {
  await connect({ action: "accept", content: { choice: "proceed" } });
  const result = await client.callTool({ name: TOOL, arguments: ARGS });
  assert.equal(result.structuredContent.status, "proceed");
  assert.equal(result.content[0].text, renderTemplate(texts.proceed, { custom: ARGS.custom }));
});

test("cancelling sends the agent back to the implementation choice", async () => {
  await connect({ action: "accept", content: { choice: "cancel" } });
  const result = await client.callTool({ name: TOOL, arguments: ARGS });
  assert.equal(result.structuredContent.status, "cancelled");
  assert.equal(result.content[0].text, texts.cancelled);
});

for (const action of ["decline", "cancel"]) {
  test(`closing the form (${action}) counts as cancelling`, async () => {
    await connect({ action });
    const result = await client.callTool({ name: TOOL, arguments: ARGS });
    assert.equal(result.structuredContent.status, "cancelled");
    assert.equal(result.content[0].text, texts.cancelled);
  });
}

test("without elicitation support the agent must ask in the conversation", async () => {
  await connect(null);
  const result = await client.callTool({ name: TOOL, arguments: ARGS });
  assert.equal(result.structuredContent.status, "unavailable");
  assert.ok(result.structuredContent.reason.length > 0);
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.unavailable, { reason: result.structuredContent.reason }),
  );
});

test("a call without any problem is rejected", async () => {
  await connect({ action: "cancel" });
  const result = await client.callTool({ name: TOOL, arguments: { ...ARGS, problems: [] } });
  assert.equal(result.isError, true);
  assert.equal(elicitations.length, 0);
});
