import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEntries } from "../keep_track/memory-store.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Remplace chaque {{clé}} du gabarit par sa valeur.
function render(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key]);
}

// Met des entrées sous forme de liste Markdown, ou indique qu'il n'y en a aucune.
function list(entries, strings) {
  if (entries.length === 0) {
    return strings.none;
  }
  return entries
    .map((e) => render(strings.entry, { lesson: e.lesson, kind: e.kind, context: e.context ?? strings.noContext, count: e.count }))
    .join("\n");
}

// Regroupe les entrées warm par espace, chacun sous son propre titre.
function byNamespace(entries, strings) {
  if (entries.length === 0) {
    return strings.none;
  }
  const namespaces = [...new Set(entries.map((e) => e.namespace))];
  return namespaces
    .map((ns) => `### ${ns}\n\n${list(entries.filter((e) => e.namespace === ns), strings)}`)
    .join("\n\n");
}

// Construit le document de passation à partir des entrées de la mémoire.
function buildHandoff(memoryDir, entries) {
  const strings = JSON.parse(readText("strings.json"));
  const tier = (name) => entries.filter((e) => e.tier === name);
  const hot = tier("hot");
  const summary = entries.length
    ? render(strings.summary, { total: entries.length, namespaces: new Set(entries.map((e) => e.namespace)).size })
    : strings.empty;
  return render(readText("template.md"), {
    createdAt: new Date().toISOString(),
    memoryDir,
    hot: hot.length,
    warm: tier("warm").length,
    cold: tier("cold").length,
    summary,
    important: list(hot.filter((e) => e.kind === "preference"), strings),
    patterns: list(hot.filter((e) => e.kind !== "preference"), strings),
    knowledge: byNamespace(tier("warm"), strings),
    archives: list(tier("cold"), strings),
  });
}

// Déclare l'outil qui produit un document de passation à partir de la mémoire de keep_track, sans la modifier.
export function registerHandoff(server, memoryDir) {
  server.registerTool(
    "handoff",
    {
      title: "Handoff",
      description: readText("tool-description.md"),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    // Relit la mémoire à chaque appel pour refléter son état courant.
    async () => ({ content: [{ type: "text", text: buildHandoff(memoryDir, loadEntries(memoryDir)) }] }),
  );
}
