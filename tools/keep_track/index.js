import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadEntries, saveEntries } from "./memory-store.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

// Résultat renvoyé à l'agent, sous forme de texte et d'état exploitable par programme.
function reply(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
}

// Ajoute une entrée à la mémoire ; une entrée sans leçon est refusée sans rien écrire.
function record(memoryDir, { kind, lesson, context }) {
  if (!lesson) {
    return { isError: true, content: [{ type: "text", text: 'Action "record" requires a lesson.' }] };
  }
  const entry = { kind, lesson, context, recordedAt: new Date().toISOString() };
  saveEntries(memoryDir, [...loadEntries(memoryDir), entry]);
  return reply({ status: "recorded", entry });
}

// Déclare l'outil qui conserve les leçons de l'agent dans memoryDir entre les sessions.
export function registerKeepTrack(server, memoryDir) {
  server.registerTool(
    "keep_track",
    {
      title: "Keep track",
      description: readFileSync(path.join(CONTEXT_DIR, "tool-description.md"), "utf8").trim(),
      inputSchema: {
        action: z.enum(["record", "recall"]).describe("What to do with the memory"),
        kind: z.enum(["preference"]).optional().describe("Type of lesson to record"),
        lesson: z.string().min(1).optional().describe("The lesson to record"),
        context: z.string().optional().describe("Where the lesson came from"),
      },
      annotations: { openWorldHint: false },
    },
    // Exécute l'action demandée sur la mémoire relue à chaque appel.
    async ({ action, ...input }) => {
      if (action === "record") {
        return record(memoryDir, input);
      }
      return reply({ status: "recalled", entries: loadEntries(memoryDir) });
    },
  );
}
