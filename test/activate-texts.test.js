import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TEXTS_DIR, loadTexts, renderTemplate } from "../src/activate/texts.js";

const here = path.dirname(fileURLToPath(import.meta.url));

test("default texts dir is the activate context folder", () => {
  assert.equal(DEFAULT_TEXTS_DIR, path.resolve(here, "..", "src", "activate", "context"));
});

test("templates replace every occurrence of each placeholder", () => {
  assert.equal(renderTemplate("{{a}} and {{b}}, again {{a}}", { a: "x", b: "y" }), "x and y, again x");
});

test("unknown placeholders are left untouched", () => {
  assert.equal(renderTemplate("{{a}} {{missing}}", { a: "x" }), "x {{missing}}");
});

test("shipped texts are all present and non-empty", () => {
  const texts = loadTexts();
  for (const key of ["created", "replaced", "exists"]) {
    assert.equal(typeof texts[key], "string", key);
    assert.ok(texts[key].length > 0, key);
  }
});
