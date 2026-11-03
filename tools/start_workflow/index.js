import { z } from "zod";
import { buildContext, loadManifest, loadServerTexts } from "./context.js";
import { applyAutoVersioning } from "./auto-versioning.js";
import { validateTests } from "../validate_tests/index.js";
import { chooseImplementation } from "../choose_implementation/index.js";
import { confirmCustomImplementation } from "../confirm_custom_implementation/index.js";

const STEPS = new Map(
  [validateTests, chooseImplementation, confirmCustomImplementation].map((step) => [step.name, step]),
);

// Documente chaque étape interne dans la description du paramètre step.
function describeSteps() {
  const docs = [...STEPS.values()].map((step) => `- "${step.name}": ${step.description}`);
  return ["Internal workflow step to run with `input` instead of returning the rules:", ...docs].join("\n");
}

// Résultat d'erreur renvoyé à l'agent sans interrompre la session.
function toolError(message) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

// Valide l'entrée de l'étape demandée puis l'exécute ; une entrée invalide n'atteint jamais l'opérateur.
async function runStep(server, name, input) {
  const step = STEPS.get(name);
  const parsed = step.inputSchema.safeParse(input);
  if (!parsed.success) {
    return toolError(`Invalid input for step "${name}":\n${z.prettifyError(parsed.error)}`);
  }
  return step.run(server, parsed.data);
}

// Déclare l'outil qui renvoie les règles de travail lues dans contextDir et donne accès aux étapes internes.
export function registerStartWorkflow(server, contextDir) {
  const { toolDescription } = loadServerTexts(contextDir);
  const sectionIds = loadManifest(contextDir).sections.map((s) => s.id);

  server.registerTool(
    "start_workflow",
    {
      title: "Start workflow",
      description: toolDescription,
      inputSchema: {
        sections: z
          .array(z.string())
          .optional()
          .describe(`Section ids to return (all when omitted): ${sectionIds.join(", ")}`),
        step: z.enum([...STEPS.keys()]).optional().describe(describeSteps()),
        input: z.record(z.string(), z.unknown()).optional().describe("Input of the step, as documented in `step`"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    // Exécute l'étape demandée, sinon relit les fichiers de contexte pour que les modifications s'appliquent sans redémarrage.
    async ({ sections, step, input }) => {
      if (step) {
        return runStep(server, step, input);
      }
      try {
        const rules = buildContext(contextDir, sections);
        const texts = await applyAutoVersioning(server, rules);
        return { content: texts.map((text) => ({ type: "text", text })) };
      } catch (error) {
        return toolError(error.message);
      }
    },
  );
}
