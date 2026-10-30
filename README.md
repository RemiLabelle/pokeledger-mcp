# pokeledger-mcp

Serveur MCP (Model Context Protocol) en JavaScript, exposé en **stdio** et
distribué sous forme d'image **Docker**.

## Outils

| Outil            | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `ping`           | Vérifie que le serveur répond. Renvoie `pong`.                         |
| `start_workflow` | Renvoie les règles de travail obligatoires pour l'agent (ci-dessous). |
| `validate_tests` | Demande à l'opérateur de valider les tests avant le développement.    |

## Contexte de travail de l'agent

`start_workflow` fournit à l'agent les règles à appliquer pendant toute
tâche de code : versionnage local après chaque unité sémantique (sans
co-auteur, sans jamais pousser), conventions Git,
workflow TDD et commentaires en français. Les instructions du serveur lui
demandent d'appeler cet outil avant de commencer. Le paramètre optionnel
`sections` (`terminology`, `versioning`, `git`, `tdd`, `comments`) limite la
réponse.

Les règles et les messages destinés à l'agent sont rédigés en français avec
les mots-clés du BCP 14 ([RFC 2119], [RFC 8174]) en majuscules : DOIT,
NE DOIT PAS, DEVRAIT, PEUT… La section `terminology` donne la correspondance
avec les mots-clés anglais.

Toutes les règles et tous les textes destinés au modèle sont dans
`tools/start_workflow/context/`,
séparés du code :

| Fichier                   | Contenu                                         |
| ------------------------- | ----------------------------------------------- |
| `manifest.json`           | Liste et ordre des sections, fichiers associés  |
| `terminology.md`          | Mots-clés BCP 14 et leur correspondance         |
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

Pour utiliser un autre dossier de règles, définir
`POKELEDGER_START_WORKFLOW_CONTEXT_DIR` :

```bash
docker run -i --rm -v "$PWD/mes-regles:/rules" -e POKELEDGER_START_WORKFLOW_CONTEXT_DIR=/rules pokeledger-mcp
```

## Validation des tests par l'opérateur

Une fois les tests d'une tâche écrits, l'agent appelle `validate_tests` avec la
tâche, la portée et la liste des cas couverts. Le serveur présente ce résumé à
l'opérateur par une **élicitation MCP** (formulaire natif du client) :
l'opérateur valide les tests ou demande une reprise en précisant ce qui doit
changer. L'outil renvoie un `status` :

| `status`        | Consigne pour l'agent                                          |
| --------------- | -------------------------------------------------------------- |
| `validated`     | Committer les tests puis commencer le développement            |
| `rework`        | Retravailler les tests selon `feedback`, puis rappeler l'outil |
| `not_validated` | L'opérateur a refusé ou annulé : ne pas développer             |
| `unavailable`   | Client sans élicitation : demander la validation dans le chat  |

Les messages et libellés du formulaire sont dans
`tools/validate_tests/context/` (gabarits `{{clé}}` et `strings.json`) et sont
relus à chaque appel.

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
src/index.js                  point d'entrée stdio
src/server.js                 création du serveur, enregistrement des outils
tools/<outil>/                un dossier par outil
  index.js                    déclaration de l'outil
  *.test.js ou test/          tests de l'outil
tools/start_workflow/
  context.js                  chargement des fichiers de contexte
  context/                    règles et textes destinés au modèle
  test/fixtures/              dossiers de contexte de test
tools/validate_tests/
  texts.js                    chargement et rendu des gabarits
  context/                    messages à l'opérateur et à l'agent
```

[RFC 2119]: https://www.rfc-editor.org/rfc/rfc2119
[RFC 8174]: https://www.rfc-editor.org/rfc/rfc8174
