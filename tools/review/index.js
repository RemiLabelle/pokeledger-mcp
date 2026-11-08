import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const CONTEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "context");

const COMMON = [
  "common/priority.md",
  "common/pipeline.md",
  "common/challenge.md",
  "common/qa.md",
  "common/exploratory.md",
];

const SIDES = {
  review_back: {
    title: "Backend review",
    files: [
      ...COMMON,
      "back/idempotency.md",
      "back/express-security.md",
      "back/prisma.md",
      "back/rls.md",
      "back/api-testing.md",
      "back/jest.md",
    ],
  },
  review_front: {
    title: "Frontend review",
    files: [...COMMON, "front/passive-view.md", "front/double-submit.md"],
  },
};

const MODES = {
  review: [],
  architecture_audit: ["audits/architecture.md"],
  test_audit: ["audits/test-suite.md"],
};

// Lit un fichier de texte du dossier de contexte des revues.
function readText(file) {
  return readFileSync(path.join(CONTEXT_DIR, file), "utf8").trim();
}

// Déclare les outils de revue frontend et backend, chacun avec le socle commun et ses critères propres.
export function registerReview(server) {
  for (const [name, side] of Object.entries(SIDES)) {
    server.registerTool(
      name,
      {
        title: side.title,
        description: readText(`${name}.md`),
        inputSchema: {
          mode: z
            .enum(Object.keys(MODES))
            .default("review")
            .describe("\"review\" for a change review, \"architecture_audit\" or \"test_audit\" to add an audit"),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      },
      // Relit les textes à chaque appel pour que les modifications s'appliquent sans redémarrage.
      async ({ mode }) => ({
        content: [...side.files, ...MODES[mode]].map((file) => ({ type: "text", text: readText(file) })),
      }),
    );
  }
}
