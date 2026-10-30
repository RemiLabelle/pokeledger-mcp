import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONTEXT_DIR,
  resolveContextDir,
  loadManifest,
  buildContext,
  loadServerTexts,
} from "../context.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, "fixtures", name);
const SEPARATOR = "\n\n---\n\n";

test("default context dir is the repository context folder", () => {
  assert.equal(DEFAULT_CONTEXT_DIR, path.resolve(here, "..", "context"));
});

test("POKELEDGER_START_WORKFLOW_CONTEXT_DIR overrides the context dir", () => {
  const dir = fixture("context-full");
  assert.equal(resolveContextDir({ POKELEDGER_START_WORKFLOW_CONTEXT_DIR: dir }), path.resolve(dir));
});

test("context dir falls back to the default when the variable is unset or empty", () => {
  assert.equal(resolveContextDir({}), DEFAULT_CONTEXT_DIR);
  assert.equal(resolveContextDir({ POKELEDGER_START_WORKFLOW_CONTEXT_DIR: "" }), DEFAULT_CONTEXT_DIR);
});

test("manifest lists sections in declared order", () => {
  const manifest = loadManifest(fixture("context-full"));
  assert.deepEqual(manifest.sections.map((s) => s.id), ["alpha", "beta"]);
  assert.equal(manifest.sections[0].title, "Alpha");
});

test("missing manifest raises an explicit error", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "pokeledger-ctx-"));
  assert.throws(() => loadManifest(empty), /manifest\.json/);
});

test("full context concatenates every section in manifest order", () => {
  assert.equal(
    buildContext(fixture("context-full")),
    "# Alpha\n\nAlpha rule." + SEPARATOR + "# Beta\n\nBeta rule.",
  );
});

test("an empty section list returns the full context", () => {
  const dir = fixture("context-full");
  assert.equal(buildContext(dir, []), buildContext(dir));
});

test("selected sections keep manifest order and are deduplicated", () => {
  const dir = fixture("context-full");
  assert.equal(buildContext(dir, ["beta"]), "# Beta\n\nBeta rule.");
  assert.equal(buildContext(dir, ["beta", "alpha", "beta"]), buildContext(dir));
});

test("unknown sections raise an error listing the available ids", () => {
  assert.throws(
    () => buildContext(fixture("context-full"), ["alpha", "zzz"]),
    /Unknown section\(s\): zzz\. Available: alpha, beta/,
  );
});

test("a section pointing to a missing file raises an error naming the file", () => {
  assert.throws(() => buildContext(fixture("context-broken")), /missing-file\.md/);
});

test("server texts are read from the files named in the manifest", () => {
  assert.deepEqual(loadServerTexts(fixture("context-full")), {
    instructions: "Fixture instructions.",
    toolDescription: "Fixture tool description.",
  });
});

test("server texts are undefined when the manifest omits them", () => {
  assert.deepEqual(loadServerTexts(fixture("context-minimal")), {
    instructions: undefined,
    toolDescription: undefined,
  });
});

test("shipped context is complete and includes the git conventions", () => {
  const manifest = loadManifest(DEFAULT_CONTEXT_DIR);
  const ids = manifest.sections.map((s) => s.id);
  for (const id of ["versioning", "git", "tdd", "comments"]) assert.ok(ids.includes(id), id);

  const gitFile = manifest.sections.find((s) => s.id === "git").file;
  const gitText = readFileSync(path.join(DEFAULT_CONTEXT_DIR, gitFile), "utf8").trim();
  assert.ok(buildContext(DEFAULT_CONTEXT_DIR).includes(gitText));

  const texts = loadServerTexts(DEFAULT_CONTEXT_DIR);
  assert.ok(texts.instructions.length > 0);
  assert.ok(texts.toolDescription.length > 0);
});
