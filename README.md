# pokeledger-mcp

Serveur MCP (Model Context Protocol) en JavaScript, exposé en **stdio** et
distribué sous forme d'image **Docker**.

## Outils

Quatre outils sont publics :

| Outil            | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `ping`           | Vérifie que le serveur répond. Renvoie `pong`.                                      |
| `start_workflow` | Renvoie les règles de travail de l'agent (ci-dessous) et exécute les étapes internes. |
| `keep_track`     | Conserve entre les sessions ce que l'agent apprend de l'opérateur.                  |
| `neuralyze`      | Efface toute la mémoire de `keep_track`, après confirmation de l'opérateur.         |

Les étapes internes ne sont pas listées comme outils ; l'agent les lance par
`start_workflow` avec `step` et `input` :

| `step`                          | Rôle                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| `validate_tests`                | Demande à l'opérateur de valider les tests avant le développement.     |
| `choose_implementation`         | Fait choisir à l'opérateur l'implémentation d'une logique non établie. |
| `confirm_custom_implementation` | Fait confirmer une implémentation personnalisée problématique.         |

```json
{ "step": "validate_tests", "input": { "task": "…", "scope": "…", "cases": ["…"] } }
```

Une étape inconnue ou un `input` invalide renvoie une erreur sans solliciter
l'opérateur. La description du paramètre `step` documente chaque étape.

## Contexte de travail de l'agent

`start_workflow` fournit à l'agent les règles à appliquer pendant toute
tâche de code : versionnage local après chaque unité sémantique (sans
co-auteur, sans jamais pousser), conventions Git,
workflow TDD et commentaires en français. Les instructions du serveur lui
demandent d'appeler cet outil avant de commencer. Le paramètre optionnel
`sections` (`terminology`, `versioning`, `git`, `tdd`, `decisions`,
`comments`) limite la réponse.

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
| `decisions.md`            | Choix d'implémentation par l'opérateur          |
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

## Mémoire de l'agent

`keep_track` s'inspire du skill
[self-improving](https://clawhub.ai/ivangdavila/skills/self-improving) : il en
reprend les niveaux, les limites de taille et la promotion, mais ni la
dégradation dans le temps ni les fichiers d'espace de travail.

| Action   | Rôle                                                                       |
| -------- | -------------------------------------------------------------------------- |
| `record` | Enregistre une leçon, ou compte sa répétition.                             |
| `recall` | Renvoie le niveau `hot`, le niveau `warm` d'un `namespace` ou, avec `query`, les entrées de tous les niveaux. |
| `stats`  | Compte les entrées de chaque niveau.                                       |

| Niveau | Contenu                                         | Limite                     |
| ------ | ----------------------------------------------- | -------------------------- |
| `hot`  | Préférences et leçons répétées trois fois       | 100 entrées                |
| `warm` | Nouvelles corrections et réflexions             | 200 entrées par `namespace` |
| `cold` | Entrées archivées, atteintes seulement par `query` | Aucune                  |

Au-delà d'une limite, l'entrée la plus ancienne descend d'un niveau. Le niveau
`cold` grandit donc jusqu'au prochain appel de `neuralyze`.

La mémoire est un fichier `memory.json` situé dans
`POKELEDGER_KEEP_TRACK_DIR`, par défaut `~/.pokeledger/keep-track`. Avec
`docker run --rm`, elle est perdue à la sortie du conteneur sans volume :

```bash
docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track pokeledger-mcp
```

## Validation des tests par l'opérateur

Une fois les tests d'une tâche écrits, l'agent lance l'étape `validate_tests` avec la
tâche, la portée et la liste des cas couverts. Le serveur présente ce résumé à
l'opérateur par une **élicitation MCP** (formulaire natif du client) :
l'opérateur valide les tests ou demande une reprise en précisant ce qui doit
changer. L'étape renvoie un `status` :

| `status`        | Consigne pour l'agent                                          |
| --------------- | -------------------------------------------------------------- |
| `validated`     | Committer les tests puis commencer le développement            |
| `rework`        | Retravailler les tests selon `feedback`, puis relancer l'étape |
| `not_validated` | L'opérateur a refusé ou annulé : ne pas développer             |
| `unavailable`   | Client sans élicitation : demander la validation dans le chat  |

Avec `validated`, l'étape renvoie aussi le **skill de développement**
(`tools/validate_tests/context/development-skill.md`) dans un second bloc de
texte : abstraction privilégiée, principes SOLID et patrons de conception
identifiables par les noms de fichiers, classes, packages ou méthodes.

Les messages et libellés du formulaire sont dans
`tools/validate_tests/context/` (gabarits `{{clé}}` et `strings.json`) et sont
relus à chaque appel.

## Décisions d'implémentation

Pendant le développement, l'agent implémente directement ce qui est établi.
Dès qu'il doit interpréter ou inventer une pièce de logique centrale, il lance
l'étape `choose_implementation` avec des options éprouvées, alignées sur le code
existant, chacune accompagnée d'un court extrait de code. L'opérateur choisit
une option ou décrit sa propre implémentation :

| `status`      | Consigne pour l'agent                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `chosen`      | Implémenter l'option choisie                                            |
| `custom`      | Vérifier l'alignement ; sans problème, l'implémenter telle quelle       |
| `incomplete`  | Implémentation personnalisée vide : relancer l'étape                   |
| `not_chosen`  | L'opérateur a refusé ou fermé le formulaire : demander dans le chat     |
| `unavailable` | Client sans élicitation : présenter les options dans le chat            |

Si l'implémentation personnalisée pose des problèmes (désalignement, mauvaise
odeur de code, anti-patron), l'agent lance l'étape `confirm_custom_implementation`
avec la liste des problèmes. `proceed` : l'agent l'implémente telle quelle,
sans la réévaluer. `cancelled` (y compris formulaire fermé) : l'agent relance
`choose_implementation` avec les mêmes options.

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

## Utilisation avec Codex (OpenAI)

Construire d'abord l'image Docker (voir ci-dessus), puis l'ajouter à Codex :

```bash
codex mcp add pokeledger -- docker run -i --rm pokeledger-mcp
```

Ou dans `~/.codex/config.toml` (`.codex/config.toml` pour un projet de
confiance) ; la CLI Codex, l'extension IDE et l'application de bureau
partagent cette configuration :

```toml
[mcp_servers.pokeledger]
command = "docker"
args = ["run", "-i", "--rm", "pokeledger-mcp"]
```

Pour utiliser un dossier de règles personnalisé :

```toml
[mcp_servers.pokeledger]
command = "docker"
args = ["run", "-i", "--rm", "-v", "/chemin/vers/mes-regles:/rules",
        "-e", "POKELEDGER_START_WORKFLOW_CONTEXT_DIR=/rules", "pokeledger-mcp"]
```

Les étapes `validate_tests`, `choose_implementation` et
`confirm_custom_implementation` attendent la réponse de l'opérateur dans un
formulaire. Codex rejette automatiquement ces formulaires sauf si sa politique
d'approbation les autorise (`approval_policy.granular.mcp_elicitations`) ;
sinon, l'étape renvoie `not_validated`, `not_chosen` ou `cancelled` et l'agent
doit demander la réponse dans la conversation. Si l'opérateur tarde à
répondre, augmenter `tool_timeout_sec` (60 s par défaut) dans
`[mcp_servers.pokeledger]`.

## Structure

L'organisation des fichiers est décrite dans
[docs/architecture.md](docs/architecture.md).

[RFC 2119]: https://www.rfc-editor.org/rfc/rfc2119
[RFC 8174]: https://www.rfc-editor.org/rfc/rfc8174
