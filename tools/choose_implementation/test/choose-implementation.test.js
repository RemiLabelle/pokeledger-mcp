import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";
import { loadTexts, renderTemplate } from "../texts.js";

const STEP = "choose_implementation";
const texts = loadTexts();
const OPTIONS = [
  {
    title: "Map lookup",
    rationale: "Matches the registry pattern used in src/server.js.",
    snippet: "const handlers = new Map([[\"a\", handleA]]);",
  },
  {
    title: "Switch statement",
    rationale: "Simplest for a fixed set of cases.",
    snippet: "switch (kind) { case \"a\": return handleA(); }",
  },
];
const ARGS = {
  decision: "Dispatch events to handlers",
  context: "The event loop in src/events.js has no dispatch strategy yet.",
  options: OPTIONS,
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

// Exécute l'étape interne en passant par l'outil public start_workflow.
function runStep(input) {
  return client.callTool({ name: "start_workflow", arguments: { step: STEP, input } });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("the step is not a public tool but is documented by start_workflow", async () => {
  await connect({ action: "cancel" });
  const { tools } = await client.listTools();
  assert.equal(tools.some((t) => t.name === STEP), false);
  const startWorkflow = tools.find((t) => t.name === "start_workflow");
  assert.ok(startWorkflow.inputSchema.properties.step.enum.includes(STEP));
  assert.ok(startWorkflow.inputSchema.properties.step.description.includes(texts.toolDescription));
});

test("the operator receives the decision, its context and every numbered option with its snippet", async () => {
  await connect({ action: "cancel" });
  await runStep(ARGS);
  assert.equal(elicitations.length, 1);
  const options = OPTIONS.map((option, index) =>
    renderTemplate(texts.option, { number: String(index + 1), ...option }),
  ).join("\n\n");
  assert.equal(
    elicitations[0].message,
    renderTemplate(texts.request, { decision: ARGS.decision, context: ARGS.context, options }),
  );
});

test("the operator form offers each option plus a custom implementation", async () => {
  await connect({ action: "cancel" });
  await runStep(ARGS);
  const schema = elicitations[0].requestedSchema;
  assert.deepEqual(schema.required, ["choice"]);
  assert.deepEqual(schema.properties.choice.enum, ["1", "2", "custom"]);
  assert.deepEqual(schema.properties.choice.enumNames, [
    "Map lookup",
    "Switch statement",
    texts.strings.customChoice,
  ]);
  assert.equal(schema.properties.custom.type, "string");
});

test("choosing an option tells the agent to implement it", async () => {
  await connect({ action: "accept", content: { choice: "2" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "chosen");
  assert.equal(result.structuredContent.choice, "2");
  assert.equal(result.structuredContent.title, "Switch statement");
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.chosen, { number: "2", title: "Switch statement" }),
  );
});

test("a chosen option wins over text typed in the custom field", async () => {
  await connect({ action: "accept", content: { choice: "1", custom: "Use a class hierarchy" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "chosen");
  assert.equal(result.structuredContent.title, "Map lookup");
});

test("a custom implementation is returned for the agent to assess", async () => {
  await connect({ action: "accept", content: { choice: "custom", custom: "Use an event emitter" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "custom");
  assert.equal(result.structuredContent.custom, "Use an event emitter");
  assert.equal(result.content[0].text, renderTemplate(texts.custom, { custom: "Use an event emitter" }));
});

for (const content of [{ choice: "custom" }, { choice: "custom", custom: "   " }]) {
  test(`a custom choice without a description is incomplete (${JSON.stringify(content.custom)})`, async () => {
    await connect({ action: "accept", content });
    const result = await runStep(ARGS);
    assert.equal(result.structuredContent.status, "incomplete");
    assert.equal(result.content[0].text, texts.incomplete);
  });
}

for (const action of ["decline", "cancel"]) {
  test(`a ${action} response is not a choice`, async () => {
    await connect({ action });
    const result = await runStep(ARGS);
    assert.equal(result.structuredContent.status, "not_chosen");
    assert.equal(result.content[0].text, renderTemplate(texts.notChosen, { action }));
  });
}

test("without elicitation support the agent must ask in the conversation", async () => {
  await connect(null);
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "unavailable");
  assert.ok(result.structuredContent.reason.length > 0);
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.unavailable, { reason: result.structuredContent.reason }),
  );
});

test("a call without any option is rejected", async () => {
  await connect({ action: "cancel" });
  const result = await runStep({ ...ARGS, options: [] });
  assert.equal(result.isError, true);
  assert.equal(elicitations.length, 0);
});

test("an option without a code snippet is rejected", async () => {
  await connect({ action: "cancel" });
  const { snippet, ...withoutSnippet } = OPTIONS[0];
  const result = await runStep({ ...ARGS, options: [withoutSnippet] });
  assert.equal(result.isError, true);
  assert.equal(elicitations.length, 0);
});
