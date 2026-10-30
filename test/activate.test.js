import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { activate, formatResult, generateToken } from "../src/activate/index.js";

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

let dir;
let envPath;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pokeledger-activate-"));
  envPath = path.join(dir, ".env");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("a generated token is 32 random bytes in base64url", () => {
  assert.match(generateToken(), TOKEN_FORMAT);
});

test("two generated tokens differ", () => {
  assert.notEqual(generateToken(), generateToken());
});

test("without .env, activation creates it with the token", () => {
  const result = activate({ envPath });
  assert.equal(result.status, "created");
  assert.match(result.token, TOKEN_FORMAT);
  assert.equal(readFileSync(envPath, "utf8"), `PL_MCP_TOKEN=${result.token}\n`);
});

test("a created .env is readable by its owner only", { skip: process.platform === "win32" }, () => {
  activate({ envPath });
  assert.equal(statSync(envPath).mode & 0o777, 0o600);
});

test("an existing .env without the token keeps its content and gets the token appended", () => {
  writeFileSync(envPath, "OTHER=1\nANOTHER=two\n");
  const result = activate({ envPath });
  assert.equal(result.status, "created");
  assert.equal(readFileSync(envPath, "utf8"), `OTHER=1\nANOTHER=two\nPL_MCP_TOKEN=${result.token}\n`);
});

test("an existing .env without a final newline gets the token on its own line", () => {
  writeFileSync(envPath, "OTHER=1");
  const result = activate({ envPath });
  assert.equal(readFileSync(envPath, "utf8"), `OTHER=1\nPL_MCP_TOKEN=${result.token}\n`);
});

test("CRLF line endings of an existing .env are preserved", () => {
  writeFileSync(envPath, "OTHER=1\r\n");
  const result = activate({ envPath });
  assert.equal(readFileSync(envPath, "utf8"), `OTHER=1\r\nPL_MCP_TOKEN=${result.token}\r\n`);
});

test("an empty PL_MCP_TOKEN is filled in place", () => {
  writeFileSync(envPath, "OTHER=1\nPL_MCP_TOKEN=\nLAST=3\n");
  const result = activate({ envPath });
  assert.equal(result.status, "created");
  assert.equal(readFileSync(envPath, "utf8"), `OTHER=1\nPL_MCP_TOKEN=${result.token}\nLAST=3\n`);
});

test("an existing token is never overwritten or revealed without force", () => {
  const original = "OTHER=1\nPL_MCP_TOKEN=keep-me\n";
  writeFileSync(envPath, original);
  const result = activate({ envPath });
  assert.deepEqual(result, { status: "exists" });
  assert.equal(readFileSync(envPath, "utf8"), original);
});

test("with force, an existing token is replaced in place", () => {
  writeFileSync(envPath, "OTHER=1\nPL_MCP_TOKEN=old-token\nLAST=3\n");
  const result = activate({ envPath, force: true });
  assert.equal(result.status, "replaced");
  assert.match(result.token, TOKEN_FORMAT);
  assert.equal(readFileSync(envPath, "utf8"), `OTHER=1\nPL_MCP_TOKEN=${result.token}\nLAST=3\n`);
});

test("with force but no existing token, the token is simply created", () => {
  const result = activate({ envPath, force: true });
  assert.equal(result.status, "created");
  assert.ok(existsSync(envPath));
});

test("the created message shows the token, the .env path and an urgent storage warning", () => {
  const message = formatResult({ status: "created", token: "tok-123" }, envPath);
  assert.ok(message.includes("tok-123"));
  assert.ok(message.includes(envPath));
  assert.ok(message.includes("URGENT"));
});

test("the replaced message shows the new token, an urgent warning and that the old one is invalid", () => {
  const message = formatResult({ status: "replaced", token: "tok-456" }, envPath);
  assert.ok(message.includes("tok-456"));
  assert.ok(message.includes("URGENT"));
  assert.match(message, /ancien jeton/i);
});

test("the exists message points to --force and reveals no token", () => {
  const message = formatResult({ status: "exists" }, envPath);
  assert.ok(message.includes(envPath));
  assert.ok(message.includes("--force"));
  assert.equal(TOKEN_FORMAT.test(message), false);
  assert.equal(message.includes("{{"), false);
});
