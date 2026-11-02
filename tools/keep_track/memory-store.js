import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const MEMORY_FILE = "memory.json";

// Détermine le dossier de la mémoire : POKELEDGER_KEEP_TRACK_DIR, sinon un dossier du répertoire personnel.
export function resolveMemoryDir(env = process.env) {
  const override = env.POKELEDGER_KEEP_TRACK_DIR;
  return override ? path.resolve(override) : path.join(homedir(), ".pokeledger", "keep-track");
}

// Lit les entrées conservées dans memoryDir ; une mémoire jamais écrite est vide.
export function loadEntries(memoryDir) {
  const file = path.join(memoryDir, MEMORY_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

// Efface toute la mémoire conservée dans memoryDir.
export function wipeEntries(memoryDir) {
  rmSync(path.join(memoryDir, MEMORY_FILE), { force: true });
}

// Écrit les entrées dans memoryDir, en créant le dossier au besoin.
export function saveEntries(memoryDir, entries) {
  mkdirSync(memoryDir, { recursive: true });
  writeFileSync(path.join(memoryDir, MEMORY_FILE), JSON.stringify(entries, null, 2));
}
