import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";
import { parseAnswer, proposeFromBranch } from "../issue-number.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "context-full");
const RULES = "# Alpha\n\nAlpha rule.\n\n---\n\n# Beta\n\nBeta rule.";
const YES = { action: "accept", content: { autoVersioning: "yes" } };
const NO = { action: "accept", content: { autoVersioning: "no" } };

let client;
let questions;

// Renvoie la réponse simulée d'un opérateur qui saisit value dans le champ du numéro d'issue.
function issue(value) {
  return { action: "accept", content: { issue: value } };
}

// Connecte un client de test dont l'opérateur simulé donne les réponses dans l'ordre, la dernière se répétant ; les questions reçues sont conservées.
async function connect(...replies) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ contextDir: FIXTURE, random: () => 1 });
  questions = [];
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: { form: {} } } });
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    questions.push(request.params);
    return replies.length > 1 ? replies.shift() : replies[0];
  });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Charge les règles de travail par start_workflow avec les arguments donnés.
async function load(args = {}) {
  return client.callTool({ name: "start_workflow", arguments: args });
}

// Vérifie que le résultat est une erreur sans les règles qui demande le numéro dans la conversation.
function assertAsksIssueInConversation(result) {
  assert.equal(result.isError, true);
  assert.equal(result.content.length, 1);
  const notice = result.content[0].text.replace(/\s+/g, " ");
  assert.doesNotMatch(notice, /Alpha rule/);
  assert.match(notice, /L'agent DOIT demander à l'opérateur, dans la conversation, le numéro de l'issue Jira/);
  assert.match(notice, /`issueNumber`/);
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("a yes asks for the issue number right after the auto versioning question", async () => {
  await connect(YES, issue("13"));
  const result = await load();
  assert.equal(questions.length, 2);
  assert.match(questions[1].message, /issue Jira/);
  assert.deepEqual(questions[1].requestedSchema.required, ["issue"]);
  assert.deepEqual(result.content[0], { type: "text", text: RULES });
  const rule = result.content[1].text.replace(/\s+/g, " ");
  assert.match(rule, /P2A26E2-13/);
  assert.match(rule, /<type>\/P2A26E2-13-<description>/);
  assert.match(rule, /P2A26E2-13 <description>/);
});

test("a no never asks for the issue number", async () => {
  await connect(NO, issue("13"));
  const result = await load({ branch: "feature/P2A26E2-4-x" });
  assert.equal(questions.length, 1);
  assert.doesNotMatch(result.content.map((c) => c.text).join("\n"), /P2A26E2-4/);
});

test("the form proposes the issue number found in the active branch", async () => {
  await connect(YES, issue("42"));
  await load({ branch: "feature/p2a26e2-42-handle-timeout" });
  const field = questions[1].requestedSchema.properties.issue;
  assert.equal(field.default, "42");
  assert.match(questions[1].message, /`feature\/p2a26e2-42-handle-timeout` : P2A26E2-42/);
});

for (const branch of [undefined, "develop"]) {
  test(`without an issue key in the branch (${branch}) the form proposes nothing`, async () => {
    await connect(YES, issue("13"));
    await load(branch ? { branch } : {});
    assert.equal(questions[1].requestedSchema.properties.issue.default, undefined);
    assert.doesNotMatch(questions[1].message, /proposé/);
  });
}

test("answering none returns the rule without issue key", async () => {
  await connect(YES, issue("Aucune"));
  const result = await load();
  assert.match(result.content[1].text, /aucune issue Jira/);
  assert.match(result.content[1].text, /NE DOIT PAS ajouter de clé/);
});

test("an invalid answer reopens the form with an error until a valid one", async () => {
  await connect(YES, issue("abc"), issue("P2A26E2-8"));
  const result = await load();
  assert.equal(questions.length, 3);
  assert.doesNotMatch(questions[1].message, /Réponse invalide/);
  assert.match(questions[2].message, /^Réponse invalide/);
  assert.match(result.content[1].text, /P2A26E2-8/);
});

test("three invalid answers stop the tool and ask in the conversation", async () => {
  await connect(YES, issue("0"));
  assertAsksIssueInConversation(await load());
  assert.equal(questions.length, 4);
});

for (const action of ["decline", "cancel"]) {
  test(`an issue form answered with ${action} stops the tool and asks again on the next load`, async () => {
    await connect(YES, { action });
    assertAsksIssueInConversation(await load());
    assertAsksIssueInConversation(await load());
    assert.equal(questions.length, 3);
  });
}

test("a client without elicitation and a yes in the conversation is stopped until the issue number is given", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ contextDir: FIXTURE, random: () => 1 });
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  assertAsksIssueInConversation(await load({ autoVersioning: true }));
  const result = await load({ issueNumber: "none" });
  assert.deepEqual(result.content[0], { type: "text", text: RULES });
  assert.match(result.content[1].text, /aucune issue Jira/);
});

test("issueNumber records the answer without opening the issue form and is kept for the session", async () => {
  await connect(YES, { action: "decline" });
  const first = await load({ issueNumber: 5 });
  const second = await load({ issueNumber: 9 });
  assert.equal(questions.length, 1);
  assert.match(first.content[1].text, /P2A26E2-5/);
  assert.deepEqual(second.content, first.content);
});

test("the tool publishes optional branch and issueNumber parameters and rejects a zero issue", async () => {
  await connect({ action: "decline" });
  const { tools } = await client.listTools();
  const { inputSchema } = tools.find((t) => t.name === "start_workflow");
  assert.equal(inputSchema.properties.branch.type, "string");
  assert.ok(inputSchema.properties.issueNumber);
  assert.ok(!inputSchema.required?.includes("issueNumber"));
  const result = await load({ issueNumber: 0 });
  assert.equal(result.isError, true);
  assert.equal(questions.length, 0);
});

test("parseAnswer accepts numbers, Jira keys and none, and rejects anything else", () => {
  assert.equal(parseAnswer(" 13 "), "13");
  assert.equal(parseAnswer("p2a26e2-13"), "13");
  assert.equal(parseAnswer("none"), "none");
  assert.equal(parseAnswer("aucun"), "none");
  for (const raw of ["", "0", "13a", "ABC-13", 13, undefined]) {
    assert.equal(parseAnswer(raw), undefined);
  }
});

test("proposeFromBranch extracts the first issue key of the branch", () => {
  assert.equal(proposeFromBranch("fix/P2A26E2-7-a"), "7");
  assert.equal(proposeFromBranch("main"), undefined);
  assert.equal(proposeFromBranch(undefined), undefined);
});
