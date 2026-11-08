import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadEntries, saveEntries } from "../keep_track/memory-store.js";
import { enforceLimits, promote, sameLesson } from "../keep_track/memory-rules.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");
const FORMAT = "pokeledger-memory";
const VERSION = 1;

const ENTRY_SCHEMA = z.object({
  kind: z.enum(["preference", "correction", "reflection"]),
  lesson: z.string().min(1),
  context: z.string().optional(),
  namespace: z.string().min(1),
  tier: z.enum(["hot", "warm", "cold"]),
  count: z.number().int().min(1),
  recordedAt: z.string(),
});

const BUNDLE_SCHEMA = z.object({
  format: z.literal(FORMAT),
  version: z.literal(VERSION),
  exportedAt: z.string(),
  entries: z.array(ENTRY_SCHEMA),
});

// Lit un fichier de texte du dossier de contexte des outils de transfert.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Résultat d'erreur renvoyé à l'agent sans rien écrire.
function toolError(message) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

// Lit et valide le paquet ; renvoie ses entrées ou le message d'erreur.
function parseBundle(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { error: `The bundle is not valid JSON: ${error.message}` };
  }
  const parsed = BUNDLE_SCHEMA.safeParse(data);
  return parsed.success ? { entries: parsed.data.entries } : { error: `Invalid bundle:\n${z.prettifyError(parsed.error)}` };
}

// Fusionne les entrées importées dans la mémoire : une même leçon additionne ses répétitions, les autres sont ajoutées.
function mergeEntries(entries, incoming) {
  let added = 0;
  let merged = 0;
  for (const entry of incoming) {
    const existing = entries.find((e) => sameLesson(e, entry));
    if (existing) {
      existing.count += entry.count;
      promote(existing);
      merged += 1;
    } else {
      entries.push({ ...entry });
      added += 1;
    }
  }
  return { entries: enforceLimits(entries), added, merged };
}

// Déclare les outils qui exportent et importent la mémoire de keep_track dans un paquet JSON versionné.
export function registerMemoryTransfer(server, memoryDir) {
  server.registerTool(
    "export_memory",
    {
      title: "Export memory",
      description: readText("export-description.md"),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    // Relit la mémoire à chaque appel et la renvoie en texte et en contenu structuré.
    async () => {
      const bundle = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), entries: loadEntries(memoryDir) };
      return { content: [{ type: "text", text: JSON.stringify(bundle, null, 2) }], structuredContent: bundle };
    },
  );

  server.registerTool(
    "import_memory",
    {
      title: "Import memory",
      description: readText("import-description.md"),
      inputSchema: { bundle: z.string().describe("JSON text of a bundle produced by export_memory, unchanged") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    // Valide tout le paquet avant d'écrire, puis fusionne ses entrées dans la mémoire.
    async ({ bundle }) => {
      const parsed = parseBundle(bundle);
      if (parsed.error) {
        return toolError(parsed.error);
      }
      const { entries, added, merged } = mergeEntries(loadEntries(memoryDir), parsed.entries);
      saveEntries(memoryDir, entries);
      const result = { status: "imported", added, merged };
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
    },
  );
}
