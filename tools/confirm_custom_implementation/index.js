import { z } from "zod";
import { loadTexts, renderTemplate } from "./texts.js";

// Met une liste sous forme de puces Markdown, une par ligne.
function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

// Construit le formulaire présenté à l'opérateur : poursuivre en connaissance de cause ou annuler.
function operatorForm(strings) {
  return {
    type: "object",
    properties: {
      choice: {
        type: "string",
        title: strings.choiceTitle,
        enum: ["proceed", "cancel"],
        enumNames: [strings.proceedLabel, strings.cancelLabel],
      },
    },
    required: ["choice"],
  };
}

// Construit le résultat de l'outil : le message pour l'agent et l'état exploitable par programme.
function reply(template, values, structuredContent) {
  return { content: [{ type: "text", text: renderTemplate(template, values) }], structuredContent };
}

// Étape interne qui fait confirmer à l'opérateur une implémentation personnalisée problématique.
export const confirmCustomImplementation = {
  name: "confirm_custom_implementation",
  description: loadTexts().toolDescription,
  inputSchema: z.object({
    decision: z.string().describe("The implementation decision being made, in one line"),
    custom: z.string().describe("The operator's custom implementation"),
    problems: z
      .array(z.string())
      .min(1)
      .describe("Misalignments, code smells or anti-patterns the custom implementation introduces"),
  }),
  // Présente les problèmes à l'opérateur ; toute réponse autre que « poursuivre » vaut annulation.
  async run(server, { decision, custom, problems }) {
    const texts = loadTexts();
    const message = renderTemplate(texts.request, { decision, custom, problems: bullets(problems) });

    let answer;
    try {
      answer = await server.server.elicitInput({ message, requestedSchema: operatorForm(texts.strings) });
    } catch (error) {
      return reply(texts.unavailable, { reason: error.message }, { status: "unavailable", reason: error.message });
    }

    if (answer.action === "accept" && answer.content.choice === "proceed") {
      return reply(texts.proceed, { custom }, { status: "proceed" });
    }
    return reply(texts.cancelled, {}, { status: "cancelled" });
  },
};
