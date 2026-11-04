import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";

const NOTICE = "Le skill devops guide le travail actuel.";

let client;

// Appelle l'outil devops et renvoie son résultat brut.
async function callDevops(args) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client.callTool({ name: "devops", arguments: args });
}

// Réunit les blocs de texte d'un résultat sur une seule chaîne.
function textOf(result) {
  return result.content.map((block) => block.text).join("\n");
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

const REFERENCES = [
  ["browser-rendering", "# Cloudflare Browser Rendering"],
  ["cloudflare-d1-kv", "# Cloudflare D1 & KV"],
  ["cloudflare-platform", "# Cloudflare Platform Overview"],
  ["cloudflare-r2-storage", "# Cloudflare R2 Storage"],
  ["cloudflare-workers-advanced", "# Cloudflare Workers Advanced Patterns"],
  ["cloudflare-workers-apis", "# Cloudflare Workers Runtime APIs"],
  ["cloudflare-workers-basics", "# Cloudflare Workers Basics"],
  ["docker-basics", "# Docker Basics"],
  ["docker-compose", "# Docker Compose"],
  ["gcloud-platform", "# Google Cloud Platform with gcloud CLI"],
  ["gcloud-services", "# Google Cloud Services"],
  ["kubernetes-basics", "# Kubernetes Core Concepts"],
  ["kubernetes-helm", "# Helm Package Management"],
  ["kubernetes-helm-advanced", "# Helm Advanced - Templates & Hooks"],
  ["kubernetes-kubectl", "# kubectl Essential Commands"],
  ["kubernetes-security", "# Kubernetes Security"],
  ["kubernetes-security-advanced", "# Kubernetes Security Advanced"],
  ["kubernetes-troubleshooting", "# Kubernetes Troubleshooting"],
  ["kubernetes-troubleshooting-advanced", "# Kubernetes Troubleshooting Advanced"],
  ["kubernetes-workflows", "# Kubernetes Workflows"],
  ["kubernetes-workflows-advanced", "# Kubernetes Workflows Advanced"],
];

for (const [reference, heading] of REFERENCES) {
  test(`the ${reference} reference is available`, async () => {
    const result = await callDevops({ reference });
    assert.ok(!result.isError);
    assert.ok(textOf(result).split(/\r?\n/).includes(heading));
  });
}

test("a reference is returned instead of the main skill", async () => {
  const text = textOf(await callDevops({ reference: "docker-basics" }));
  assert.doesNotMatch(text, /## Platform Selection/);
});

test("reading a reference never repeats the operator notice", async () => {
  const text = textOf(await callDevops({ reference: "docker-basics", trigger: "automatic" }));
  assert.ok(!text.includes(NOTICE));
});

test("an unknown reference is rejected", async () => {
  const result = await callDevops({ reference: "../../../package" });
  assert.ok(result.isError);
  assert.doesNotMatch(textOf(result), /pokeledger-mcp/);
});

test("the main skill says that its scripts are not provided", async () => {
  const text = textOf(await callDevops({}));
  assert.match(text, /Les scripts cités par ce skill ne sont pas fournis/);
});

test("the main skill says how to read a reference", async () => {
  const text = textOf(await callDevops({}));
  assert.match(text, /paramètre `reference`/);
});
