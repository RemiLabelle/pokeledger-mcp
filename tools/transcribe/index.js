import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { askOperatorForm } from "../operator_form/index.js";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");
const API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const MODEL_ID = "scribe_v2";

// Lit un fichier de texte du dossier de contexte de l'outil.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Remplace chaque {{clé}} du gabarit par sa valeur.
function render(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key]);
}

// Résultat d'échec renvoyé à l'agent, sous forme de texte et d'état exploitable par programme.
function failure(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
}

// Construit le formulaire qui demande le chemin du fichier mp3 à l'opérateur.
function pathForm(strings) {
  return {
    type: "object",
    properties: { path: { type: "string", title: strings.pathTitle, description: strings.pathDescription } },
    required: ["path"],
  };
}

// Demande le chemin du fichier à l'opérateur ; renvoie le chemin ou le résultat d'échec à transmettre à l'agent.
async function askPath(server, strings) {
  let answer;
  try {
    answer = await askOperatorForm(server, { message: readText("request.md"), requestedSchema: pathForm(strings) });
  } catch (error) {
    return { result: failure({ status: "unavailable", reason: error.message, instructions: readText("ask-in-conversation.md") }) };
  }
  if (answer.action !== "accept") {
    return { result: failure({ status: "not_provided", action: answer.action, instructions: readText("ask-in-conversation.md") }) };
  }
  return { path: answer.content.path };
}

// Vérifie que le chemin désigne un fichier mp3 existant.
function isMp3File(file) {
  return path.extname(file).toLowerCase() === ".mp3" && statSync(file, { throwIfNoEntry: false })?.isFile() === true;
}

// Explique un code d'erreur HTTP de l'API.
function describeStatus(strings, status) {
  return render(strings.causes[status] ?? strings.causes.default, { status });
}

// Envoie le fichier à l'API ElevenLabs et traduit la réponse en résultat pour l'agent.
async function requestTranscript(fetch, apiKey, file, strings) {
  const body = new FormData();
  body.append("model_id", MODEL_ID);
  body.append("file", new File([readFileSync(file)], path.basename(file), { type: "audio/mpeg" }));

  let response;
  try {
    response = await fetch(API_URL, { method: "POST", headers: { "xi-api-key": apiKey }, body });
  } catch (error) {
    return failure({ status: "api_error", httpStatus: null, instructions: render(readText("api-error.md"), { cause: error.message }) });
  }
  if (!response.ok) {
    const cause = describeStatus(strings, response.status);
    return failure({ status: "api_error", httpStatus: response.status, instructions: render(readText("api-error.md"), { cause }) });
  }
  const { text, language_code: languageCode } = await response.json();
  return { content: [{ type: "text", text }], structuredContent: { status: "transcribed", path: file, text, languageCode } };
}

// Déclare l'outil qui transcrit un fichier mp3 fourni par l'opérateur ; fetch et env sont les frontières vers l'API et l'environnement.
export function registerTranscribe(server, { fetch, env }) {
  server.registerTool(
    "transcribe",
    {
      title: "Transcribe",
      description: readText("tool-description.md"),
      inputSchema: {
        path: z
          .string()
          .min(1)
          .optional()
          .describe("Path of the mp3 file, only when explicitly given by the operator in the conversation"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    // Vérifie la clé, obtient le chemin (paramètre ou formulaire), contrôle le fichier puis demande la transcription.
    async (args) => {
      const strings = JSON.parse(readText("strings.json"));
      const apiKey = env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return failure({ status: "missing_key", instructions: readText("missing-key.md") });
      }
      const asked = args.path ? { path: args.path } : await askPath(server, strings);
      if (asked.result) {
        return asked.result;
      }
      if (!isMp3File(asked.path)) {
        return failure({ status: "invalid_file", path: asked.path, instructions: render(readText("invalid-file.md"), { path: asked.path }) });
      }
      return requestTranscript(fetch, apiKey, asked.path, strings);
    },
  );
}
