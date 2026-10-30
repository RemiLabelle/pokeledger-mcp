import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { loadTexts, renderTemplate } from "./texts.js";

const TOKEN_LINE = /^PL_MCP_TOKEN=(.*)$/m;

// Génère un jeton bearer de 32 octets aléatoires, encodé en base64url.
export function generateToken() {
  return randomBytes(32).toString("base64url");
}

// Ajoute une ligne à la fin du contenu d'un .env, sur sa propre ligne et avec ses fins de ligne.
function appendLine(content, line, eol) {
  const separator = content === "" || content.endsWith("\n") ? "" : eol;
  return `${content}${separator}${line}${eol}`;
}

// Écrit un nouveau jeton PL_MCP_TOKEN dans le .env, sans jamais écraser ni révéler un jeton existant sans force.
export function activate({ envPath, force = false }) {
  const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const match = TOKEN_LINE.exec(content);
  const current = match?.[1].trim() ?? "";
  if (current && !force) return { status: "exists" };

  const token = generateToken();
  const line = `PL_MCP_TOKEN=${token}`;
  const next = match ? content.replace(TOKEN_LINE, () => line) : appendLine(content, line, eol);
  // Le mode 0600 ne s'applique qu'à la création : le .env n'est alors lisible que par son propriétaire.
  writeFileSync(envPath, next, { mode: 0o600 });
  return { status: current ? "replaced" : "created", token };
}

// Construit le message du terminal correspondant au résultat de l'activation.
export function formatResult(result, envPath) {
  return renderTemplate(loadTexts()[result.status], { envPath, token: result.token });
}
