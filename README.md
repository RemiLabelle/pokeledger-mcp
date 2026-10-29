# pokeledger-mcp

Serveur MCP (Model Context Protocol) en JavaScript, exposé en **stdio** et
distribué sous forme d'image **Docker**.

## Outils

| Outil  | Description                                        |
| ------ | -------------------------------------------------- |
| `ping` | Vérifie que le serveur répond. Renvoie `pong`.     |

## Développement local

Prérequis : Node.js 20 ou plus.

```bash
npm install
npm test        # tests (node:test)
npm start       # lance le serveur sur stdio
```

Les journaux sont écrits sur `stderr` : `stdout` est réservé au flux JSON-RPC.

## Docker

Construire l'image :

```bash
docker build -t pokeledger-mcp .
```

Lancer le serveur (l'option `-i` est obligatoire pour garder `stdin` ouvert) :

```bash
docker run -i --rm pokeledger-mcp
```

## Utilisation avec Claude Code

```bash
claude mcp add pokeledger -- docker run -i --rm pokeledger-mcp
```

Ou dans un fichier `.mcp.json` :

```json
{
  "mcpServers": {
    "pokeledger": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "pokeledger-mcp"]
    }
  }
}
```

## Structure

```text
src/server.js   création du serveur et déclaration des outils
src/index.js    point d'entrée stdio
test/           tests
```
