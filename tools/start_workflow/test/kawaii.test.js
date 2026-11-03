import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "context-full");
const RULES = "# Alpha\n\nAlpha rule.\n\n---\n\n# Beta\n\nBeta rule.";

let client;

// Connecte un client de test à un serveur dont la source d'aléa est imposée.
async function connect(random) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ contextDir: FIXTURE, random });
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Charge les règles en donnant déjà la réponse sur le versionnage automatique, pour isoler le tirage.
async function load() {
  return client.callTool({ name: "start_workflow", arguments: { autoVersioning: true } });
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("a roll just under 1/1000 returns the rules followed by the kawaii style instruction", async () => {
  await connect(() => 0.0009);
  const result = await load();
  assert.equal(result.content.length, 2);
  assert.deepEqual(result.content[0], { type: "text", text: RULES });
  const style = result.content[1].text.replace(/\s+/g, " ");
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
  assert.deepEqual(result.content, [{ type: "text", text: RULES }]);
});
