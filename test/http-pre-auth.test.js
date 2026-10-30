import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createHttpServer } from "../src/http.js";

const TOKEN = "test-token-0123456789abcdef";
const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "probe", version: "0.0.0" } },
});

let httpServer;
let port;

beforeEach(async () => {
  httpServer = createHttpServer({ token: TOKEN });
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  port = httpServer.address().port;
});

afterEach(async () => {
  httpServer.closeAllConnections();
  await new Promise((resolve) => httpServer.close(resolve));
});

// Écrit des octets bruts sur une connexion TCP et renvoie tout ce que le serveur a émis avant de la fermer.
function rawExchange(payload) {
  return new Promise((resolve) => {
    const chunks = [];
    const socket = net.connect(port, "127.0.0.1", () => socket.write(payload));
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("error", () => {});
    socket.on("close", () => resolve(Buffer.concat(chunks).toString()));
  });
}

// Construit l'en-tête d'une requête POST /mcp qui attend un 100 Continue avant d'envoyer son corps.
function expectContinueHead(authorization) {
  const lines = [
    "POST /mcp HTTP/1.1",
    "Host: 127.0.0.1",
    "Content-Type: application/json",
    "Accept: application/json, text/event-stream",
    `Content-Length: ${Buffer.byteLength(INITIALIZE)}`,
    "Expect: 100-continue",
    "Connection: close",
  ];
  if (authorization) lines.push(`Authorization: ${authorization}`);
  return `${lines.join("\r\n")}\r\n\r\n`;
}

test("a malformed request is dropped without any byte (no 400 Bad Request)", async () => {
  assert.equal(await rawExchange("GARBAGE\r\n\r\n"), "");
});

test("a request with oversized headers is dropped without any byte (no 431)", async () => {
  // Juste au-dessus de la limite de 16 Kio de Node : assez petit pour que la réponse ne soit pas perdue dans un RST.
  const head = `GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Padding: ${"a".repeat(17 * 1024)}\r\n\r\n`;
  assert.equal(await rawExchange(head), "");
});

test("Expect: 100-continue without token is dropped without any byte", async () => {
  assert.equal(await rawExchange(expectContinueHead()), "");
});

test("Expect: 100-continue with a wrong token is dropped without any byte", async () => {
  assert.equal(await rawExchange(expectContinueHead(`Bearer ${TOKEN}x`)), "");
});

test("Expect: 100-continue with the valid token gets 100 Continue, then the MCP response", async () => {
  const received = await new Promise((resolve) => {
    let data = "";
    const socket = net.connect(port, "127.0.0.1", () => socket.write(expectContinueHead(`Bearer ${TOKEN}`)));
    socket.on("data", (chunk) => {
      data += chunk;
      if (data.startsWith("HTTP/1.1 100 Continue\r\n\r\n") && !socket.bodySent) {
        socket.bodySent = true;
        socket.write(INITIALIZE);
      }
      if (data.includes('"protocolVersion"')) socket.destroy();
    });
    socket.on("close", () => resolve(data));
  });
  assert.ok(received.startsWith("HTTP/1.1 100 Continue\r\n\r\n"), received);
  assert.match(received, /HTTP\/1\.1 200 OK/);
  assert.match(received, /"protocolVersion"/);
});
