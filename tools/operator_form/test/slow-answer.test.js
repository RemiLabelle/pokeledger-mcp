import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const OPERATOR_DELAY_MS = 61_000;
const CLIENT_TIMEOUT_MS = 120_000;
const OPTION = { title: "dummy", rationale: "dummy", snippet: "dummy" };
const clients = [];

// Connecte un client dont l'opérateur simulé donne la réponse fournie après plus de 60 secondes.
async function connectSlowOperator(content) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const memoryDir = mkdtempSync(path.join(tmpdir(), "pokeledger-memory-"));
  const server = createServer({ memoryDir, random: () => 1 });
  const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities: { elicitation: { form: {} } } });
  client.setRequestHandler(ElicitRequestSchema, async () => {
    await new Promise((resolve) => setTimeout(resolve, OPERATOR_DELAY_MS));
    return { action: "accept", content };
  });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  clients.push(client);
  return client;
}

// Appelle un outil en laissant au client le temps d'attendre la réponse lente.
function call(client, name, args) {
  return client.callTool({ name, arguments: args }, undefined, { timeout: CLIENT_TIMEOUT_MS });
}

after(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe("an operator answering after more than 60 seconds is still heard", { concurrency: true }, () => {
  it("on validate_tests", async () => {
    const client = await connectSlowOperator({ decision: "validate" });
    const result = await call(client, "start_workflow", { step: "validate_tests", input: { task: "t", scope: "s", cases: ["c"] } });
    assert.equal(result.structuredContent.status, "validated");
  });

  it("on choose_implementation", async () => {
    const client = await connectSlowOperator({ choice: "1" });
    const result = await call(client, "start_workflow", { step: "choose_implementation", input: { decision: "d", context: "c", options: [OPTION] } });
    assert.equal(result.structuredContent.status, "chosen");
  });

  it("on confirm_custom_implementation", async () => {
    const client = await connectSlowOperator({ choice: "proceed" });
    const result = await call(client, "start_workflow", { step: "confirm_custom_implementation", input: { decision: "d", custom: "c", problems: ["p"] } });
    assert.equal(result.structuredContent.status, "proceed");
  });

  it("on neuralyze", async () => {
    const client = await connectSlowOperator({ confirm: true });
    const result = await call(client, "neuralyze", {});
    assert.equal(result.structuredContent.status, "wiped");
  });

  it("on the auto versioning question", async () => {
    const client = await connectSlowOperator({ autoVersioning: "no" });
    const result = await call(client, "start_workflow", { sections: ["comments"] });
    assert.match(result.content[0].text, /AVERTISSEMENT MAJEUR/);
  });
});
