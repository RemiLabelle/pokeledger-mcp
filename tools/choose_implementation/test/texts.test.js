import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TEXTS_DIR, loadTexts, renderTemplate } from "../texts.js";

const here = path.dirname(fileURLToPath(import.meta.url));

test("default texts dir is the tool's context folder", () => {
  assert.equal(DEFAULT_TEXTS_DIR, path.resolve(here, "..", "context"));
});

test("templates replace every occurrence of each placeholder", () => {
  assert.equal(renderTemplate("{{a}} and {{b}}, again {{a}}", { a: "x", b: "y" }), "x and y, again x");
});

test("unknown placeholders are left untouched", () => {
  assert.equal(renderTemplate("{{a}} {{missing}}", { a: "x" }), "x {{missing}}");
});

test("shipped texts are all present and non-empty", () => {
  const texts = loadTexts();
  for (const key of [
    "toolDescription",
    "request",
    "option",
    "chosen",
    "custom",
    "incomplete",
    "notChosen",
    "unavailable",
  ]) {
    assert.equal(typeof texts[key], "string", key);
    assert.ok(texts[key].length > 0, key);
  }
  for (const key of ["choiceTitle", "customChoice", "customTitle", "customDescription"]) {
    assert.equal(typeof texts.strings[key], "string", key);
  }
});

test("shipped templates expose the placeholders the tool fills", () => {
  const texts = loadTexts();
  for (const placeholder of ["{{decision}}", "{{context}}", "{{options}}"]) {
    assert.ok(texts.request.includes(placeholder), placeholder);
  }
  for (const placeholder of ["{{number}}", "{{title}}", "{{rationale}}", "{{snippet}}"]) {
    assert.ok(texts.option.includes(placeholder), placeholder);
  }
  assert.ok(texts.chosen.includes("{{title}}"));
  assert.ok(texts.custom.includes("{{custom}}"));
  assert.ok(texts.notChosen.includes("{{action}}"));
  assert.ok(texts.unavailable.includes("{{reason}}"));
});

test("a texts folder with missing files raises an error naming the file", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "pokeledger-texts-"));
  assert.throws(() => loadTexts(empty), /\.(md|json)/);
});
