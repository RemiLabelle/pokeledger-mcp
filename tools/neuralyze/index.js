import { askOperatorForm } from "../operator_form/index.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEntries, wipeEntries } from "../keep_track/memory-store.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Résultat renvoyé à l'agent, sous forme de texte et d'état exploitable par programme.
function reply(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
}

// Construit le formulaire de confirmation présenté à l'opérateur.
function confirmationForm(strings) {
  return {
    type: "object",
    properties: {
      confirm: { type: "boolean", title: strings.confirmTitle, description: strings.confirmDescription },
    },
    required: ["confirm"],
  };
}

// Déclare l'outil qui efface toute la mémoire de keep_track après confirmation de l'opérateur.
export function registerNeuralyze(server, memoryDir) {
  server.registerTool(
    "neuralyze",
    {
      title: "Neuralyze",
      description: readText("tool-description.md"),
      annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    // Demande la confirmation de l'opérateur et n'efface la mémoire qu'en cas d'acceptation explicite.
    async () => {
      const removed = loadEntries(memoryDir).length;
      const strings = JSON.parse(readText("strings.json"));
      const message = readText("request.md").replace("{{count}}", removed);
      let answer;
      try {
        answer = await askOperatorForm(server, { message, requestedSchema: confirmationForm(strings) });
      } catch (error) {
        return reply({ status: "unavailable", reason: error.message, instructions: readText("not-confirmed.md") });
      }
      if (answer.action !== "accept" || answer.content.confirm !== true) {
        return reply({ status: "not_confirmed", action: answer.action, instructions: readText("not-confirmed.md") });
      }
      wipeEntries(memoryDir);
      return reply({ status: "wiped", removed });
    },
  );
}
