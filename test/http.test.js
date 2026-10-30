import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createHttpServer } from "../src/http.js";

const TOKEN = "test-token-0123456789abcdef";
const MCP_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "probe", version: "0.0.0" } },
});

let httpServer;
let port;
let clients;

beforeEach(async () => {
  httpServer = createHttpServer({ token: TOKEN });
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  port = httpServer.address().port;
  clients = [];
});

afterEach(async () => {
  await Promise.all(clients.map((client) => client.close()));
  httpServer.closeAllConnections();
  await new Promise((resolve) => httpServer.close(resolve));
});

// Envoie une requête HTTP brute et renvoie la réponse reçue, ou l'erreur réseau si la connexion est coupée.
function rawRequest(path, { method = "POST", headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const request = http.request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () =>
        resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }),
      );
    });
    request.on("error", (error) => resolve({ error }));
    request.end(body);
  });
}

// Vérifie qu'aucune réponse HTTP n'a été émise : la connexion a été coupée sans le moindre octet.
function assertSilentlyDropped(result) {
  assert.equal(result.status, undefined, `unexpected HTTP response ${result.status}: ${result.body}`);
  assert.ok(result.error, "the connection should have been dropped");
}

// Connecte un client MCP authentifié ; capabilities et onElicit permettent de répondre aux élicitations.
async function connectClient({ capabilities = {}, onElicit } = {}) {
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
  });
  const client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  if (onElicit) client.setRequestHandler(ElicitRequestSchema, onElicit);
  await client.connect(transport);
  clients.push(client);
  return { client, transport };
}

test("the HTTP server cannot be created without a token (fail closed)", () => {
  assert.throws(() => createHttpServer());
  assert.throws(() => createHttpServer({ token: undefined }));
  assert.throws(() => createHttpServer({ token: "" }));
});

test("a request without Authorization header is dropped without any response", async () => {
  assertSilentlyDropped(await rawRequest("/mcp", { headers: MCP_HEADERS, body: INITIALIZE }));
});

test("a request with a wrong token is dropped without any response", async () => {
  const headers = { ...MCP_HEADERS, authorization: `Bearer ${TOKEN}x` };
  assertSilentlyDropped(await rawRequest("/mcp", { headers, body: INITIALIZE }));
});

test("a request with the token under another scheme is dropped without any response", async () => {
  const headers = { ...MCP_HEADERS, authorization: `Basic ${TOKEN}` };
  assertSilentlyDropped(await rawRequest("/mcp", { headers, body: INITIALIZE }));
});

test("unauthenticated requests are dropped on every path and method", async () => {
  assertSilentlyDropped(await rawRequest("/", { method: "GET" }));
  assertSilentlyDropped(await rawRequest("/does-not-exist", { method: "GET" }));
  assertSilentlyDropped(await rawRequest("/mcp", { method: "GET" }));
  assertSilentlyDropped(await rawRequest("/mcp", { method: "DELETE" }));
  assertSilentlyDropped(await rawRequest("/mcp", { method: "OPTIONS", headers: { origin: "http://evil.example" } }));
});

test("an authenticated client gets the instructions and the public tools", async () => {
  const { client } = await connectClient();
  assert.ok(client.getInstructions());
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["ping", "start_workflow"]);
  const result = await client.callTool({ name: "ping", arguments: {} });
  assert.deepEqual(result.content, [{ type: "text", text: "pong" }]);
});

test("a valid session id does not replace the bearer token", async () => {
  const { transport } = await connectClient();
  assert.ok(transport.sessionId);
  const body = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const headers = { ...MCP_HEADERS, "mcp-session-id": transport.sessionId, "mcp-protocol-version": "2025-06-18" };
  assertSilentlyDropped(await rawRequest("/mcp", { headers, body }));
});

test("concurrent authenticated sessions are independent", async () => {
  const first = await connectClient();
  const second = await connectClient();
  assert.notEqual(first.transport.sessionId, second.transport.sessionId);
  const results = await Promise.all([
    first.client.callTool({ name: "ping", arguments: {} }),
    second.client.callTool({ name: "ping", arguments: {} }),
  ]);
  for (const result of results) assert.deepEqual(result.content, [{ type: "text", text: "pong" }]);
});

test("operator elicitation works over HTTP within a session", async () => {
  const { client } = await connectClient({
    capabilities: { elicitation: { form: {} } },
    onElicit: async () => ({ action: "accept", content: { decision: "validate" } }),
  });
  const result = await client.callTool({
    name: "start_workflow",
    arguments: { step: "validate_tests", input: { task: "t", scope: "s", cases: ["c"] } },
  });
  assert.equal(result.structuredContent.status, "validated");
});

test("a terminated session can no longer be used", async () => {
  const { transport } = await connectClient();
  const sessionId = transport.sessionId;
  await transport.terminateSession();
  const body = JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} });
  const headers = {
    ...MCP_HEADERS,
    authorization: `Bearer ${TOKEN}`,
    "mcp-session-id": sessionId,
    "mcp-protocol-version": "2025-06-18",
  };
  const result = await rawRequest("/mcp", { headers, body });
  assert.ok(result.status >= 400 && result.status < 500, `expected a client error, got ${result.status}`);
  assert.equal(result.body.includes("tools"), false);
});

test("an authenticated request outside /mcp gets an empty 404", async () => {
  const result = await rawRequest("/other", { method: "GET", headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(result.status, 404);
  assert.equal(result.body, "");
});
