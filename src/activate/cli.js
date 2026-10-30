#!/usr/bin/env node
import path from "node:path";
import { activate, formatResult } from "./index.js";

// Point d'entrée de `npm run activate` : le jeton est écrit dans le .env du dossier courant, jamais exposé sur le réseau.
const envPath = path.resolve(process.cwd(), ".env");
const result = activate({ envPath, force: process.argv.includes("--force") });
console.log(formatResult(result, envPath));
process.exitCode = result.status === "exists" ? 1 : 0;
