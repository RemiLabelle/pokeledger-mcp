import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadEntries, saveEntries } from "./memory-store.js";
import { enforceLimits, normalize, promote, sameLesson } from "./memory-rules.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

// Résultat renvoyé à l'agent, sous forme de texte et d'état exploitable par programme.
function reply(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
}

// Compte une répétition de l'entrée et la promeut au niveau hot à partir du seuil.
function bumpEntry(entry) {
  entry.count += 1;
  entry.recordedAt = new Date().toISOString();
  return promote(entry);
}

// Crée une entrée : une préférence explicite va au niveau hot, le reste commence au niveau warm.
function createEntry({ kind, lesson, context, namespace }) {
  const tier = kind === "preference" ? "hot" : "warm";
  return { kind, lesson, context, namespace, tier, count: 1, recordedAt: new Date().toISOString() };
}

// Enregistre une leçon ou compte sa répétition ; une entrée sans leçon ou sans type est refusée sans rien écrire.
function record(memoryDir, { kind, lesson, context, namespace = "global" }) {
  if (!lesson || !kind) {
    return { isError: true, content: [{ type: "text", text: 'Action "record" requires a kind and a lesson.' }] };
  }
  const entries = loadEntries(memoryDir);
  const repeated = entries.find((e) => sameLesson(e, { namespace, lesson }));
  const entry = repeated ? bumpEntry(repeated) : createEntry({ kind, lesson, context, namespace });
  saveEntries(memoryDir, enforceLimits(repeated ? entries : [...entries, entry]));
  return reply({ status: "recorded", entry });
}

// Rappelle les entrées : une requête cherche partout, sinon le niveau hot et le niveau warm de l'espace demandé.
function recall(memoryDir, { query, namespace }) {
  const entries = loadEntries(memoryDir);
  const selected = query
    ? entries.filter((e) => normalize(e.lesson).includes(normalize(query)))
    : entries.filter((e) => e.tier === "hot" || (e.tier === "warm" && e.namespace === namespace));
  return reply({ status: "recalled", entries: selected });
}

// Compte les entrées de chaque niveau.
function stats(memoryDir) {
  const tiers = { hot: 0, warm: 0, cold: 0 };
  for (const entry of loadEntries(memoryDir)) {
    tiers[entry.tier] += 1;
  }
  return reply({ status: "stats", tiers });
}

const ACTIONS = { record, recall, stats };

// Déclare l'outil qui conserve les leçons de l'agent dans memoryDir entre les sessions.
export function registerKeepTrack(server, memoryDir) {
  server.registerTool(
    "keep_track",
    {
      title: "Keep track",
      description: readFileSync(path.join(CONTEXT_DIR, "tool-description.md"), "utf8").trim(),
      inputSchema: {
        action: z.enum(Object.keys(ACTIONS)).describe("What to do with the memory"),
        kind: z.enum(["preference", "correction", "reflection"]).optional().describe("Type of lesson to record"),
        lesson: z.string().min(1).optional().describe("The lesson to record"),
        context: z.string().optional().describe("Where the lesson came from"),
        namespace: z.string().min(1).optional().describe("Project or domain the lesson applies to (global by default)"),
        query: z.string().min(1).optional().describe("Text to search for in every tier and namespace when recalling"),
      },
      annotations: { openWorldHint: false },
    },
    // Exécute l'action demandée sur la mémoire relue à chaque appel.
    async ({ action, ...input }) => ACTIONS[action](memoryDir, input),
  );
}
