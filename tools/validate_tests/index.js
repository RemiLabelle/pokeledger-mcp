import { askOperatorForm } from "../operator_form/index.js";
import { z } from "zod";
import { loadTexts, renderTemplate } from "./texts.js";

// Met une liste sous forme de puces Markdown, une par ligne.
function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

// Construit le formulaire présenté à l'opérateur : une décision et des retours facultatifs.
function operatorForm(strings) {
  return {
    type: "object",
    properties: {
      decision: {
        type: "string",
        title: strings.decisionTitle,
        enum: ["validate", "rework"],
        enumNames: [strings.decisionValidate, strings.decisionRework],
      },
      feedback: { type: "string", title: strings.feedbackTitle, description: strings.feedbackDescription },
    },
    required: ["decision"],
  };
}

// Construit le résultat de l'outil ; la consigne est aussi dans l'état, seul contenu visible sur certains clients.
function reply(template, values, structuredContent) {
  const text = renderTemplate(template, values);
  return { content: [{ type: "text", text }], structuredContent: { ...structuredContent, instructions: text } };
}

// Étape interne qui demande à l'opérateur de valider les tests avant le développement.
export const validateTests = {
  name: "validate_tests",
  description: loadTexts().toolDescription,
  inputSchema: z.object({
    task: z.string().describe("The task under development, in one line"),
    scope: z.string().describe("Scope and functional guidelines defined by the tests"),
    cases: z.array(z.string()).min(1).describe("Behaviours covered by the tests, one per item"),
    testFiles: z.array(z.string()).optional().describe("Paths of the test files"),
  }),
  // Soumet le résumé des tests à l'opérateur et traduit sa réponse en consigne pour l'agent.
  async run(server, { task, scope, cases, testFiles }) {
    const texts = loadTexts();
    const message = renderTemplate(texts.request, {
      task,
      scope,
      cases: bullets(cases),
      testFiles: testFiles?.length ? bullets(testFiles) : texts.strings.noTestFiles,
    });

    let answer;
    try {
      answer = await askOperatorForm(server, { message, requestedSchema: operatorForm(texts.strings) });
    } catch (error) {
      return reply(
        texts.unavailable,
        { reason: error.message },
        { status: "unavailable", reason: error.message, question: message },
      );
    }

    if (answer.action !== "accept") {
      return reply(
        texts.notValidated,
        { action: answer.action },
        { status: "not_validated", action: answer.action, question: message },
      );
    }

    const { decision, feedback = "" } = answer.content;
    if (decision === "validate") {
      const result = reply(
        texts.validated,
        { feedback: feedback || texts.strings.noFeedback },
        { status: "validated", feedback },
      );
      // Le skill de développement suit la validation pour guider l'agent pendant le développement.
      result.content.push({ type: "text", text: texts.developmentSkill });
      result.structuredContent.instructions += `\n\n${texts.developmentSkill}`;
      return result;
    }
    return reply(texts.rework, { feedback: feedback || texts.strings.noReworkFeedback }, { status: "rework", feedback });
  },
};
