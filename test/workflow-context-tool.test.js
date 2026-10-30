import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { DEFAULT_CONTEXT_DIR, buildContext, loadServerTexts } from "../src/context.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "context-full");
const TOOL = "get_workflow_context";

let client;

async function connect(options) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(options);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

afterEach(async () => {
  delete process.env.POKELEDGER_CONTEXT_DIR;
  await client?.close();
  client = undefined;
});

test("tool is listed as read-only with the description from the context files", async () => {
  await connect({ contextDir: FIXTURE });
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === TOOL);
  assert.ok(tool);
  assert.equal(tool.description, "Fixture tool description.");
  assert.equal(tool.annotations.readOnlyHint, true);
});

test("server instructions come from the context files", async () => {
  await connect({ contextDir: FIXTURE });
  assert.equal(client.getInstructions(), "Fixture instructions.");
});

test("calling without arguments returns the full context", async () => {
  await connect({ contextDir: FIXTURE });
  const result = await client.callTool({ name: TOOL, arguments: {} });
  assert.deepEqual(result.content, [{ type: "text", text: buildContext(FIXTURE) }]);
});

test("calling with sections returns only those sections", async () => {
  await connect({ contextDir: FIXTURE });
  const result = await client.callTool({ name: TOOL, arguments: { sections: ["beta"] } });
  assert.deepEqual(result.content, [{ type: "text", text: "# Beta\n\nBeta rule." }]);
});

test("unknown sections return a tool error instead of throwing", async () => {
  await connect({ contextDir: FIXTURE });
  const result = await client.callTool({ name: TOOL, arguments: { sections: ["zzz"] } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Unknown section\(s\): zzz/);
});

test("context files are read at call time so edits apply without restart", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pokeledger-ctx-"));
  cpSync(FIXTURE, dir, { recursive: true });
  await connect({ contextDir: dir });

  writeFileSync(path.join(dir, "beta.md"), "Edited beta rule.\n");
  const result = await client.callTool({ name: TOOL, arguments: { sections: ["beta"] } });
  assert.equal(result.content[0].text, "Edited beta rule.");
});

test("without options the server uses the shipped context", async () => {
  await connect();
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === TOOL);
  assert.equal(tool.description, loadServerTexts(DEFAULT_CONTEXT_DIR).toolDescription);
});

test("POKELEDGER_CONTEXT_DIR selects the context folder", async () => {
  process.env.POKELEDGER_CONTEXT_DIR = FIXTURE;
  await connect();
  const result = await client.callTool({ name: TOOL, arguments: {} });
  assert.equal(result.content[0].text, buildContext(FIXTURE));
});
