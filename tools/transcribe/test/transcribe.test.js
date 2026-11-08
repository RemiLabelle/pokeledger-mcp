import { test, afterEach, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../../../src/server.js";

const API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const KEY = "test-key";

let dir;
let mp3;
let wav;
let client;
let elicitations;
let requests;

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pokeledger-audio-"));
  mp3 = path.join(dir, "meeting.mp3");
  wav = path.join(dir, "meeting.wav");
  writeFileSync(mp3, Buffer.from("ID3-fake-mp3"));
  writeFileSync(wav, Buffer.from("RIFF-fake-wav"));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

afterEach(async () => {
  await client?.close();
  client = undefined;
});

// Réponse HTTP simulée de l'API ElevenLabs.
function apiResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Connecte un client de test ; answer est la réponse de l'opérateur (null : client sans élicitation), api la réponse HTTP simulée.
async function connect({ answer = null, api = apiResponse(200, { text: "Bonjour à tous.", language_code: "fr" }), env = { ELEVENLABS_API_KEY: KEY } } = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  requests = [];
  elicitations = [];
  const fetch = async (url, init) => {
    requests.push({ url, init });
    return api;
  };
  const server = createServer({ fetch, env });
  const capabilities = answer ? { elicitation: { form: {} } } : {};
  client = new Client({ name: "test-client", version: "0.0.0" }, { capabilities });
  if (answer) {
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      elicitations.push(request.params);
      return answer;
    });
  }
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}

// Appelle l'outil transcribe et renvoie son résultat complet.
function transcribe(args = {}) {
  return client.callTool({ name: "transcribe", arguments: args });
}

test("transcribe is a public tool", async () => {
  await connect();
  const { tools } = await client.listTools();
  assert.ok(tools.some((t) => t.name === "transcribe"));
});

test("the operator form asks for the path of the mp3 file", async () => {
  await connect({ answer: { action: "accept", content: { path: mp3 } } });
  await transcribe();
  assert.equal(elicitations.length, 1);
  const { properties, required } = elicitations[0].requestedSchema;
  assert.equal(properties.path.type, "string");
  assert.deepEqual(required, ["path"]);
});

test("an accepted form sends the mp3 to ElevenLabs Scribe v2 and returns its transcript", async () => {
  await connect({ answer: { action: "accept", content: { path: mp3 } } });
  const result = await transcribe();
  assert.equal(result.structuredContent.status, "transcribed");
  assert.equal(result.structuredContent.text, "Bonjour à tous.");
  assert.equal(result.structuredContent.languageCode, "fr");
  assert.equal(result.content[0].text, "Bonjour à tous.");

  assert.equal(requests.length, 1);
  const { url, init } = requests[0];
  assert.equal(url, API_URL);
  assert.equal(init.method, "POST");
  assert.equal(init.headers["xi-api-key"], KEY);
  assert.equal(init.body.get("model_id"), "scribe_v2");
  const file = init.body.get("file");
  assert.equal(file.name, "meeting.mp3");
  assert.equal(Buffer.from(await file.arrayBuffer()).toString(), "ID3-fake-mp3");
});

for (const action of ["decline", "cancel"]) {
  test(`a form answered with ${action} transcribes nothing and asks for the path in the conversation`, async () => {
    await connect({ answer: { action } });
    const result = await transcribe();
    assert.equal(result.structuredContent.status, "not_provided");
    assert.equal(requests.length, 0);
    assert.match(result.structuredContent.instructions, /demander à l'opérateur, dans la conversation, le chemin du fichier mp3/);
  });
}

test("a client without elicitation transcribes nothing and asks for the path in the conversation", async () => {
  await connect();
  const result = await transcribe();
  assert.equal(result.structuredContent.status, "unavailable");
  assert.equal(requests.length, 0);
  assert.match(result.structuredContent.instructions, /demander à l'opérateur, dans la conversation, le chemin du fichier mp3/);
});

test("a path given as a parameter skips the form", async () => {
  await connect({ answer: { action: "decline" } });
  const result = await transcribe({ path: mp3 });
  assert.equal(elicitations.length, 0);
  assert.equal(result.structuredContent.status, "transcribed");
});

test("the path parameter may only carry a path the operator gave explicitly", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "transcribe");
  assert.match(tool.inputSchema.properties.path.description, /explicitly given by the operator/);
});

test("a missing file is reported without calling the API", async () => {
  await connect();
  const result = await transcribe({ path: path.join(dir, "absent.mp3") });
  assert.equal(result.structuredContent.status, "invalid_file");
  assert.equal(requests.length, 0);
});

test("a file that is not an mp3 is reported without calling the API", async () => {
  await connect();
  const result = await transcribe({ path: wav });
  assert.equal(result.structuredContent.status, "invalid_file");
  assert.equal(requests.length, 0);
});

test("a missing API key is reported without calling the API", async () => {
  await connect({ env: {} });
  const result = await transcribe({ path: mp3 });
  assert.equal(result.structuredContent.status, "missing_key");
  assert.match(result.structuredContent.instructions, /ELEVENLABS_API_KEY/);
  assert.equal(requests.length, 0);
});

for (const [status, cause] of [
  [401, /clé d'API invalide/],
  [422, /paramètres invalides/],
  [429, /limite de débit/],
  [500, /erreur de l'API/],
]) {
  test(`an API ${status} response is reported with its cause`, async () => {
    await connect({ api: apiResponse(status, { detail: "nope" }) });
    const result = await transcribe({ path: mp3 });
    assert.equal(result.structuredContent.status, "api_error");
    assert.equal(result.structuredContent.httpStatus, status);
    assert.match(result.structuredContent.instructions, cause);
  });
}

test("a network failure is reported as an API error", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const fetch = async () => {
    throw new Error("getaddrinfo ENOTFOUND");
  };
  const server = createServer({ fetch, env: { ELEVENLABS_API_KEY: KEY } });
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await transcribe({ path: mp3 });
  assert.equal(result.structuredContent.status, "api_error");
  assert.match(result.structuredContent.instructions, /ENOTFOUND/);
});

test("the transcription tool credits the speech-to-text skill", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "transcribe");
  assert.ok(tool.description.includes("https://tessl.io/registry/skills/github/calesthio/OpenMontage/speech-to-text"));
});
