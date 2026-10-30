import { test } from "node:test";
import assert from "node:assert/strict";
import { createBearerGuard } from "../src/auth.js";

const TOKEN = "s3cr3t-T0ken_value.with~chars";

test("the guard cannot be created without a reference token", () => {
  assert.throws(() => createBearerGuard(undefined));
  assert.throws(() => createBearerGuard(""));
});

test("the guard accepts the exact bearer token", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(`Bearer ${TOKEN}`), true);
});

test("the guard accepts the bearer scheme in any case (RFC 7235)", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(`bearer ${TOKEN}`), true);
  assert.equal(isAuthorized(`BEARER ${TOKEN}`), true);
});

test("the guard rejects a missing or empty Authorization header", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(undefined), false);
  assert.equal(isAuthorized(""), false);
  assert.equal(isAuthorized("Bearer "), false);
});

test("the guard rejects a wrong token, whatever its length", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(`Bearer ${TOKEN.replace("s", "S")}`), false);
  assert.equal(isAuthorized("Bearer x"), false);
  assert.equal(isAuthorized(`Bearer ${TOKEN.repeat(4)}`), false);
});

test("the guard rejects the token without the bearer scheme or with another scheme", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(TOKEN), false);
  assert.equal(isAuthorized(`Basic ${TOKEN}`), false);
  assert.equal(isAuthorized(`Token ${TOKEN}`), false);
});

test("the guard rejects truncated, extended or padded tokens", () => {
  const isAuthorized = createBearerGuard(TOKEN);
  assert.equal(isAuthorized(`Bearer ${TOKEN.slice(0, -1)}`), false);
  assert.equal(isAuthorized(`Bearer ${TOKEN}x`), false);
  assert.equal(isAuthorized(`Bearer ${TOKEN} `), false);
  assert.equal(isAuthorized(`Bearer  ${TOKEN}`), false);
  assert.equal(isAuthorized(`Bearer ${TOKEN} ${TOKEN}`), false);
});
