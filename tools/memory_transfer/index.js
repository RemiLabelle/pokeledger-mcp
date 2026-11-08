import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEntries } from "../keep_track/memory-store.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");
const FORMAT = "pokeledger-memory";
const VERSION = 1;

// Lit un fichier de texte du dossier de contexte des outils de transfert.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Déclare l'outil qui exporte toute la mémoire de keep_track dans un paquet JSON versionné, sans la modifier.
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
}
