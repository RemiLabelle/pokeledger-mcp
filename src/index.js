#!/usr/bin/env node
import { createHttpServer } from "./http.js";

// Sans jeton, le processus s'arrête sans aucune sortie : rien ne doit trahir l'existence du serveur.
const token = process.env.PL_MCP_TOKEN;
if (!token) process.exit(1);
// Le jeton n'a plus à rester dans l'environnement, hérité par d'éventuels processus enfants.
delete process.env.PL_MCP_TOKEN;

const host = process.env.PL_MCP_HOST ?? "127.0.0.1";
const port = Number(process.env.PL_MCP_PORT ?? 3000);

// Les journaux vont sur stderr, côté opérateur ; aucun n'est émis vers les clients.
createHttpServer({ token }).listen(port, host, () => {
  console.error(`pokeledger-mcp listening on http://${host}:${port}/mcp`);
});
