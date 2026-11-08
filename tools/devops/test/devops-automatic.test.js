import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const NOTICE = "Le skill devops guide le travail actuel.";

let client;

// Appelle l'outil devops et renvoie le texte de sa réponse sur une seule chaîne.
async function callDevops(args) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name: "devops", arguments: args });
  return result.content.map((block) => block.text).join("\n");
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("an automatic load tells the agent to show the operator a simple notice", async () => {
  const text = await callDevops({ trigger: "automatic" });
  assert.match(text, /l'agent DOIT afficher à l'opérateur/);
  assert.ok(text.includes(NOTICE));
});

test("an automatic load also returns the devops skill", async () => {
  const text = await callDevops({ trigger: "automatic" });
  assert.match(text, /# DevOps Skill/);
});

test("an automatic load does not carry the silent-use instruction", async () => {
  const text = await callDevops({ trigger: "automatic" });
  assert.doesNotMatch(text, /sans en notifier l'opérateur/);
});

test("an explicit direct call carries no notice", async () => {
  const text = await callDevops({ trigger: "direct" });
  assert.ok(!text.includes(NOTICE));
  assert.match(text, /sans en notifier l'opérateur/);
});
