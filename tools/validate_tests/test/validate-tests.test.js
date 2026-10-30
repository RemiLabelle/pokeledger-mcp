import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";
import { loadTexts, renderTemplate } from "../texts.js";

const STEP = "validate_tests";
const texts = loadTexts();
const ARGS = {
  task: "Add a login form",
  scope: "Validates credentials and reports errors.",
  cases: ["rejects an empty password", "accepts valid credentials"],
  testFiles: ["test/login.test.js"],
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

test("the operator receives the task, scope, cases and test files", async () => {
  await connect({ action: "cancel" });
  await runStep(ARGS);
  assert.equal(elicitations.length, 1);
  assert.equal(
    elicitations[0].message,
    renderTemplate(texts.request, {
      task: ARGS.task,
      scope: ARGS.scope,
      cases: "- rejects an empty password\n- accepts valid credentials",
      testFiles: "- test/login.test.js",
    }),
  );
});

test("missing test files are announced as unspecified", async () => {
  await connect({ action: "cancel" });
  const { testFiles, ...args } = ARGS;
  await runStep(args);
  assert.ok(elicitations[0].message.includes(texts.strings.noTestFiles));
});

test("the operator form asks for a decision and optional feedback", async () => {
  await connect({ action: "cancel" });
  await runStep(ARGS);
  const schema = elicitations[0].requestedSchema;
  assert.deepEqual(schema.required, ["decision"]);
  assert.deepEqual(schema.properties.decision.enum, ["validate", "rework"]);
  assert.deepEqual(schema.properties.decision.enumNames, [
    texts.strings.decisionValidate,
    texts.strings.decisionRework,
  ]);
  assert.equal(schema.properties.feedback.type, "string");
});

test("a validation lets development start", async () => {
  await connect({ action: "accept", content: { decision: "validate" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "validated");
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.validated, { feedback: texts.strings.noFeedback }),
  );
});

test("remarks given with a validation are passed on", async () => {
  await connect({ action: "accept", content: { decision: "validate", feedback: "Nice coverage" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "validated");
  assert.equal(result.structuredContent.feedback, "Nice coverage");
  assert.equal(result.content[0].text, renderTemplate(texts.validated, { feedback: "Nice coverage" }));
});

test("a rework request returns the operator's feedback", async () => {
  await connect({ action: "accept", content: { decision: "rework", feedback: "Add a locked account case" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "rework");
  assert.equal(result.structuredContent.feedback, "Add a locked account case");
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.rework, { feedback: "Add a locked account case" }),
  );
});

test("a rework request without feedback tells the agent to ask for details", async () => {
  await connect({ action: "accept", content: { decision: "rework", feedback: "" } });
  const result = await runStep(ARGS);
  assert.equal(result.structuredContent.status, "rework");
  assert.equal(
    result.content[0].text,
    renderTemplate(texts.rework, { feedback: texts.strings.noReworkFeedback }),
  );
});

for (const action of ["decline", "cancel"]) {
  test(`a ${action} response is not a validation`, async () => {
    await connect({ action });
    const result = await runStep(ARGS);
    assert.equal(result.structuredContent.status, "not_validated");
    assert.equal(result.content[0].text, renderTemplate(texts.notValidated, { action }));
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

test("a call without any covered case is rejected", async () => {
  await connect({ action: "cancel" });
  const result = await runStep({ ...ARGS, cases: [] });
  assert.equal(result.isError, true);
  assert.equal(elicitations.length, 0);
});
