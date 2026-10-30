# pokeledger-mcp

Serveur MCP (Model Context Protocol) en JavaScript, exposé en **stdio** et
distribué sous forme d'image **Docker**.

## Outils

| Outil                  | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `ping`                 | Vérifie que le serveur répond. Renvoie `pong`.                     |
| `get_workflow_context` | Renvoie les règles de travail obligatoires pour l'agent (ci-dessous). |

## Contexte de travail de l'agent

`get_workflow_context` fournit à l'agent les règles à appliquer pendant toute
tâche de code : versionnage après chaque unité sémantique, conventions Git,
workflow TDD et commentaires en français. Les instructions du serveur lui
demandent d'appeler cet outil avant de commencer. Le paramètre optionnel
`sections` (`versioning`, `git`, `tdd`, `comments`) limite la réponse.

Toutes les règles et tous les textes destinés au modèle sont dans `context/`,
séparés du code :

| Fichier                   | Contenu                                         |
| ------------------------- | ----------------------------------------------- |
| `manifest.json`           | Liste et ordre des sections, fichiers associés  |
| `versioning.md`           | Cadence de versionnage                          |
| `git-conventions.md`      | Conventions Git de l'équipe                     |
| `tdd.md`                  | Workflow TDD et règle de couverture             |
| `comments.md`             | Langue des commentaires                         |
| `server-instructions.md`  | Instructions envoyées au client à la connexion  |
| `tool-description.md`     | Description de l'outil vue par le modèle        |

Les sections sont relues à chaque appel : une modification s'applique sans
redémarrage (les instructions et la description de l'outil, elles, sont lues
au démarrage). Pour ajouter une section, créer le fichier puis le déclarer
dans `manifest.json`, sans toucher au code.

Pour utiliser un autre dossier de règles, définir `POKELEDGER_CONTEXT_DIR` :

```bash
docker run -i --rm -v "$PWD/mes-regles:/rules" -e POKELEDGER_CONTEXT_DIR=/rules pokeledger-mcp
```

## Développement local

Prérequis : Node.js 22.8 ou plus.

```bash
npm install
npm test                # tests (node:test)
npm run test:coverage   # tests + seuil de couverture à 100 %
npm start               # lance le serveur sur stdio
```

`src/index.js` (point d'entrée stdio) est exclu de la couverture.

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
src/context.js  chargement des fichiers de contexte
src/index.js    point d'entrée stdio
context/        règles et textes destinés au modèle (paramétrage)
test/           tests (test/fixtures : dossiers de contexte de test)
```
