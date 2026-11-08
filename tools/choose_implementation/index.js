import { askOperatorForm } from "../operator_form/index.js";
import { z } from "zod";
import { loadTexts, renderTemplate } from "./texts.js";

const CUSTOM = "custom";

// Construit le formulaire présenté à l'opérateur : une option numérotée ou une implémentation personnalisée.
function operatorForm(options, strings) {
  return {
    type: "object",
    properties: {
      choice: {
        type: "string",
        title: strings.choiceTitle,
        enum: [...options.map((_, index) => String(index + 1)), CUSTOM],
        enumNames: [...options.map((option) => option.title), strings.customChoice],
      },
      custom: { type: "string", title: strings.customTitle, description: strings.customDescription },
    },
    required: ["choice"],
  };
}

// Construit le résultat de l'outil : le message pour l'agent et l'état exploitable par programme.
function reply(template, values, structuredContent) {
  const text = renderTemplate(template, values);
  return { content: [{ type: "text", text }], structuredContent: { ...structuredContent, instructions: text } };
}

// Étape interne qui fait choisir à l'opérateur l'implémentation d'une logique non établie.
export const chooseImplementation = {
  name: "choose_implementation",
  description: loadTexts().toolDescription,
  inputSchema: z.object({
    decision: z.string().describe("The implementation decision to make, in one line"),
    context: z.string().describe("Where and why the decision arises in the codebase"),
    options: z
      .array(
        z.object({
          title: z.string().describe("Short name of the option"),
          rationale: z.string().describe("Why this proven option fits the codebase"),
          snippet: z.string().describe("Short code excerpt showing the option in the codebase"),
        }),
      )
      .min(1)
      .describe("Proposed options, recommended one first"),
  }),
  // Soumet les options à l'opérateur et traduit son choix en consigne pour l'agent.
  async run(server, { decision, context, options }) {
    const texts = loadTexts();
    const message = renderTemplate(texts.request, {
      decision,
      context,
      options: options
        .map((option, index) => renderTemplate(texts.option, { number: String(index + 1), ...option }))
        .join("\n\n"),
    });

    let answer;
    try {
      answer = await askOperatorForm(server, { message, requestedSchema: operatorForm(options, texts.strings) });
    } catch (error) {
      return reply(
        texts.unavailable,
        { reason: error.message },
        { status: "unavailable", reason: error.message, question: message },
      );
    }

    if (answer.action !== "accept") {
      return reply(
        texts.notChosen,
        { action: answer.action },
        { status: "not_chosen", action: answer.action, question: message },
      );
    }

    const { choice, custom = "" } = answer.content;
    if (choice !== CUSTOM) {
      const { title } = options[Number(choice) - 1];
      return reply(texts.chosen, { number: choice, title }, { status: "chosen", choice, title });
    }

    const description = custom.trim();
    if (!description) {
      return reply(texts.incomplete, {}, { status: "incomplete" });
    }
    return reply(texts.custom, { custom: description }, { status: "custom", custom: description });
  },
};
