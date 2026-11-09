import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "context-full");
const RULES = "# Alpha\n\nAlpha rule.\n\n---\n\n# Beta\n\nBeta rule.";
const NO_ISSUE = readFileSync(path.join(here, "..", "context", "issue-number", "none.md"), "utf8").trim();
const BASE = [{ type: "text", text: RULES }, { type: "text", text: NO_ISSUE }];

let client;

// Connecte un client de test à un serveur dont la source d'aléa est imposée.
async function connect(random) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ contextDir: FIXTURE, random });
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Charge les règles en donnant déjà les réponses sur le versionnage automatique et l'issue, pour isoler le tirage.
async function load() {
  return client.callTool({ name: "start_workflow", arguments: { autoVersioning: true, issueNumber: "none" } });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("a roll just under 1/1000 returns the rules followed by the kawaii style instruction", async () => {
  await connect(() => 0.0009);
  const result = await load();
  assert.equal(result.content.length, 3);
  assert.deepEqual(result.content.slice(0, 2), BASE);
  const style = result.content[2].text.replace(/\s+/g, " ");
  assert.match(style, /chaque message/);
  assert.match(style, /kawaii/);
  assert.match(style, /dès que l'opérateur mentionne/i);
  assert.match(style, /sans aucun commentaire/);
  assert.match(style, /L'agent NE DOIT PAS nier/);
  assert.match(style, /question directe/);
});

test("a roll of exactly 1/1000 returns only the rules", async () => {
  await connect(() => 0.001);
  const result = await load();
  assert.deepEqual(result.content, BASE);
});

// Crée une source d'aléa qui renvoie les valeurs données dans l'ordre et compte ses appels.
function sequence(...values) {
  const source = () => {
    source.calls += 1;
    return values.shift();
  };
  source.calls = 0;
  return source;
}

test("a hit keeps the style instruction on later rule loads without rolling again", async () => {
  const random = sequence(0.0009, 0.5);
  await connect(random);
  await load();
  const second = await load();
  assert.equal(random.calls, 1);
  assert.equal(second.content.length, 3);
  assert.match(second.content[2].text, /kawaii/);
});

test("a miss stays a miss on later rule loads without rolling again", async () => {
  const random = sequence(0.5, 0.0009);
  await connect(random);
  await load();
  const second = await load();
  assert.equal(random.calls, 1);
  assert.deepEqual(second.content, BASE);
});

test("a step as the first call uses the session's only roll without showing the instruction", async () => {
  const random = sequence(0.0009, 0.5);
  await connect(random);
  const step = await client.callTool({ name: "start_workflow", arguments: { step: "validate_tests", input: {} } });
  assert.equal(random.calls, 1);
  const rules = await load();
  assert.equal(random.calls, 1);
  assert.equal(step.isError, true);
  assert.equal(step.content.length, 1);
  assert.doesNotMatch(step.content[0].text, /kawaii/);
  assert.equal(rules.content.length, 3);
});

test("a new server rolls again", async () => {
  await connect(() => 0.5);
  await load();
  await client.close();
  await connect(() => 0.0009);
  const result = await load();
  assert.equal(result.content.length, 3);
});
