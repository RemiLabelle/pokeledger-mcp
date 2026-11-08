# pokeledger-mcp

Serveur MCP (Model Context Protocol) en JavaScript, exposé en **stdio** et
distribué sous forme d'image **Docker**.

## Outils

Onze outils sont publics :

| Outil            | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `ping`           | Vérifie que le serveur répond. Renvoie `pong`.                                      |
| `start_workflow` | Renvoie les règles de travail de l'agent (ci-dessous) et exécute les étapes internes. |
| `keep_track`     | Conserve entre les sessions ce que l'agent apprend de l'opérateur.                  |
| `neuralyze`      | Efface toute la mémoire de `keep_track`, après confirmation de l'opérateur.         |
| `handoff`        | Produit un document de passation à partir de la mémoire de `keep_track`.            |
| `devops`         | Renvoie le skill devops ou l'une de ses références.                                 |
| `review_back`    | Renvoie les consignes de revue d'un changement backend.                             |
| `review_front`   | Renvoie les consignes de revue d'un changement frontend.                            |
| `transcribe`     | Transcrit un fichier mp3 choisi par l'opérateur, avec ElevenLabs.                   |
| `export_memory`  | Exporte la mémoire de `keep_track` dans un paquet JSON versionné.                   |
| `import_memory`  | Fusionne un paquet exporté dans la mémoire de `keep_track`.                         |

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
`sections` (`terminology`, `versioning`, `git`, `tdd`, `governance`,
`decisions`, `forms`, `documentation`, `subagents`, `skills`, `communication`,
`comments`) limite la réponse.

### Skills intégrés aux règles

Plusieurs skills publics du registre [Tessl](https://tessl.io/registry) sont
adaptés en règles françaises. Chaque fichier cite sa source. Quand un skill
contredisait les règles existantes, l'opérateur a tranché ; le tableau indique
ce qui a été retenu.

| Section ou texte | Skills | Ce qui a été adapté |
| ---------------- | ------ | ------------------- |
| `governance` | guv | Contrôle en sept points avant toute modification ; « ne rien changer » est un résultat valide. Le plus petit changement sûr devient la première option de `choose_implementation`. |
| `subagents` | subagent-driven-development | Un sous-agent implémenteur par tâche, soumis au workflow TDD et à `validate_tests`. La revue de qualité passe par `review_back` ou `review_front`. Pas de worktree. |
| `communication` | caveman | Style compressé (`full` par défaut) dans les réponses de la conversation seulement. Le code, les commits, la documentation et les formulaires restent en prose normale. |
| `documentation` | markdown-authoring, mermaid-diagrams, deep-research, content-fix, humaniser | Trois étapes dans l'ordre : rédaction, correction du contenu (sans push ni co-auteur), puis humanisation du `README` seulement. |
| Skill de développement | software-design-principles, headless-architecture, simple-typescript, api-idempotency | Une base commune (principes de conception, cœur et vue passive) et une surcouche backend (style TypeScript fonctionnel, idempotence des POST). Elles remplacent l'ancienne règle « abstraction d'abord ». |

### Skill `devops`

La section `skills` oblige l'agent à charger le skill `devops` avant toute
modification lorsqu'une tâche touche les conteneurs, la CI/CD, Kubernetes,
Cloudflare, Google Cloud ou la sécurité de l'infrastructure. Le charger n'autorise
ni déploiement, ni changement d'infrastructure, ni exécution de scripts sans
demande explicite de l'opérateur.

Le serveur fournit ce skill par l'outil public `devops` :

| Appel                              | Résultat                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `devops({})`                       | Le skill ; l'agent l'applique sans notifier l'opérateur                     |
| `devops({ trigger: "automatic" })` | Le skill ; l'agent affiche « Le skill devops guide le travail actuel. »     |
| `devops({ reference: "<nom>" })`   | Une des 21 références du skill, par exemple `docker-basics`                 |

Le serveur ne voit pas qui a demandé l'appel : le mode repose sur l'agent, qui suit
les règles de `start_workflow`. Le skill provient de
[`mrgoonie/claudekit-skills`](https://github.com/mrgoonie/claudekit-skills/tree/80113d86bc4407f105af40a2c4ea58194f7c370a/.claude/skills/devops)
(licence MIT déclarée dans son `SKILL.md`, révision `80113d8`). Il est copié sans ses
scripts dans `tools/devops/context/skill/`.

### Versionnage automatique

Au premier chargement des règles d'une session, `start_workflow` demande à
l'opérateur, par élicitation MCP, si l'agent doit versionner automatiquement
selon le workflow défini. La réponse est conservée pour la session, c'est-à-dire
pour la durée de vie du serveur.

| Réponse     | Résultat                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| Oui         | Les règles, sans changement                                                               |
| Non         | Un **avertissement majeur**, puis les règles : l'opérateur est responsable des conventions Git et l'agent ne remise, ne crée de branche ni ne committe |
| Aucune      | Les règles, puis la consigne de poser la question dans la conversation ; le formulaire est reproposé au chargement suivant |

Après une réponse dans la conversation, l'agent la transmet par le paramètre
`autoVersioning` (`true` ou `false`), qui ne remplace jamais une réponse déjà
conservée. Pour changer d'avis, il faut démarrer une nouvelle session.

### Style kawaii

Au premier appel de `start_workflow` d'une session, le serveur effectue un seul
tirage avec une chance sur 1000. S'il réussit, chaque chargement des règles
ajoute une consigne qui demande à l'agent d'écrire tous ses messages dans un
style kawaii. L'agent revient à un style normal, sans commentaire, dès que
l'opérateur mentionne ce style ; il ne le nie jamais et répond honnêtement à une
question directe. Le code, les commandes, les fichiers et les messages de commit
ne changent pas. Ce texte est dans `context/kawaii/style.md`.

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
| `tdd.md`                  | Workflow TDD par tranches et qualité des tests  |
| `governance.md`           | Contrôle de gouvernance avant une modification  |
| `decisions.md`            | Choix d'implémentation par l'opérateur          |
| `forms.md`                | Traitement des réponses aux formulaires         |
| `documentation.md`        | Rédaction, correction et humanisation des docs  |
| `subagents.md`            | Développement par sous-agents                   |
| `skills.md`               | Skills à charger et outils de revue             |
| `communication.md`        | Style compressé des réponses                    |
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
docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track -v "$PWD/mes-regles:/rules" -e POKELEDGER_START_WORKFLOW_CONTEXT_DIR=/rules pokeledger-mcp
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

## Formulaires de l'opérateur

`start_workflow` (versionnage automatique), `validate_tests`,
`choose_implementation`, `confirm_custom_implementation`, `neuralyze` et
`transcribe` questionnent l'opérateur par élicitation MCP. Tous les clients
n'affichent pas ces formulaires : l'onglet Code de l'application de bureau
Claude exécute Claude Code en mode *print*, qui les refuse automatiquement sans
les montrer. Le serveur ne peut pas distinguer ce refus de celui d'une personne.

Un formulaire laisse une heure à l'opérateur (`tools/operator_form/`), au lieu des
60 secondes par défaut du SDK, au-delà desquelles sa réponse serait perdue. La
section `forms` des règles indique à l'agent comment traiter chaque réponse :
`decline` reste un refus valide, confirmé une seule fois dans la conversation ;
`cancel` et `unavailable` l'obligent à poser la question dans la conversation.

Le résultat structuré (`structuredContent`) contient donc toujours les consignes
(`instructions`) et, si le formulaire n'est pas accepté, la réponse du client
(`action`). Les trois étapes y ajoutent la question (`question`), pour que
l'agent la pose dans la conversation.

`neuralyze` n'accepte pas de confirmation par la conversation : pour effacer la
mémoire, lancer l'outil depuis une session `claude` dans un terminal, avec le
même dossier ou le même volume de mémoire.

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
texte. Il réunit les principes de conception (SOLID vérifié question par
question, pas d'abstraction spéculative, patrons nommés seulement s'ils sont
utilisés) et l'architecture cœur et vue passive. Pour le code backend s'y
ajoutent un style TypeScript fonctionnel et l'idempotence des routes POST.

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

## Revue de code

`review_back` et `review_front` renvoient les consignes de revue d'un
changement. La section `skills` des règles oblige l'agent à les appeler avant
de terminer une tâche qui touche le code backend, le code frontend ou les deux.
L'agent présente ensuite le dossier de revue à l'opérateur avant toute
correction.

Les deux outils partagent un socle commun, puis ajoutent les critères de leur
côté :

| Partie | Skills |
| ------ | ------ |
| Socle commun | pr-review-guardrails (dossier de preuves, revue à froid, revue contradictoire, synthèse, remise à l'humain), les quatre lentilles de code-review sans la CLI Tessl, challenge-assumptions, qa-expert (gravités P0 à P4, OWASP), exploratory-testing |
| `review_back` | api-idempotency (côté serveur), express-security-basics, prisma-best-practices, rls-policy-optimization, api-testing-first-steps, jest-testing |
| `review_front` | headless-architecture (vue passive), api-idempotency (double envoi côté client) |

Les règles de travail restent prioritaires : la couverture visée reste de
100 %, et l'injection des dépendances passe avant `jest.mock`.

Le paramètre optionnel `mode` ajoute un audit, que l'agent ne lance que si
l'opérateur le demande :

| `mode` | Ajout |
| ------ | ----- |
| `review` (par défaut) | Aucun |
| `architecture_audit` | Audit d'architecture (software-architecture-audit) |
| `test_audit` | Audit de la suite de tests (codebase-test-suite-audit) |

Deux skills de la liste d'origine ne sont pas intégrés :
review-model-performance évalue des skills Tessl et non du code applicatif,
et alethia ne pilote qu'un navigateur web local, sans test E2E mobile.

## Transcription

`transcribe` s'appuie sur le skill
[speech-to-text](https://tessl.io/registry/skills/github/calesthio/OpenMontage/speech-to-text).
Un formulaire demande à l'opérateur le chemin d'un fichier mp3. Le fichier est
ensuite envoyé à ElevenLabs Scribe v2 (`scribe_v2`), et l'outil renvoie le
texte et la langue détectée. Si le formulaire n'aboutit pas, l'agent demande le
chemin dans la conversation et le transmet par le paramètre `path`.

Il faut une clé d'API ElevenLabs et monter le dossier du fichier dans le
conteneur :

```bash
docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track -v "$PWD/audio:/home/node/audio" -e ELEVENLABS_API_KEY pokeledger-mcp
```

Le chemin à donner est alors celui vu par le conteneur, par exemple
`/home/node/audio/reunion.mp3`.

| `status` | Signification |
| -------- | ------------- |
| `transcribed` | Transcription renvoyée |
| `not_provided`, `unavailable` | Pas de chemin par formulaire : le demander dans la conversation |
| `invalid_file` | Fichier introuvable ou pas en mp3 |
| `missing_key` | `ELEVENLABS_API_KEY` n'est pas définie |
| `api_error` | Échec de l'API (401, 422, 429, autre code ou réseau) |

## Passation

`handoff` s'inspire du skill
[session-handoff](https://tessl.io/registry/skills/github/softaworks/agent-toolkit/session-handoff).
Il lit la mémoire de `keep_track` sans la modifier et renvoie un document
Markdown destiné à l'agent qui reprendra le travail :

- les métadonnées et le nombre d'entrées par niveau ;
- le contexte important : les préférences de l'opérateur ;
- les schémas clés : les corrections et réflexions passées au niveau `hot` ;
- les connaissances du niveau `warm`, regroupées par `namespace` ;
- les archives du niveau `cold` ;
- les consignes de reprise.

Les sections du modèle d'origine que la mémoire ne peut pas remplir (fichiers
modifiés, processus actifs) sont omises.

## Export et import de la mémoire

`handoff` produit un document à lire, qui ne se recharge pas. Pour reprendre
le travail dans une autre session, sur un autre poste ou avec un autre volume,
l'opérateur exporte la mémoire puis l'importe :

1. Dans la session d'origine, `export_memory` renvoie un paquet JSON à
   conserver tel quel :

   ```json
   {
     "format": "pokeledger-memory",
     "version": 1,
     "exportedAt": "2026-11-08T10:00:00.000Z",
     "entries": [
       {
         "kind": "preference",
         "lesson": "Répondre en français",
         "context": "demande de l'opérateur",
         "namespace": "global",
         "tier": "hot",
         "count": 1,
         "recordedAt": "2026-11-08T09:12:44.120Z"
       }
     ]
   }
   ```

2. Dans la nouvelle session, l'agent appelle `import_memory` avec ce texte dans
   le paramètre `bundle`.

L'import fusionne au lieu de remplacer. Une même leçon dans le même `namespace`
(sans tenir compte de la casse ni des espaces autour) additionne ses
répétitions et passe au niveau `hot` à la troisième. Les autres entrées sont
ajoutées avec leurs champs d'origine, puis les limites de chaque niveau
s'appliquent comme pour `keep_track`. Le résultat indique le nombre d'entrées
ajoutées (`added`) et fusionnées (`merged`).

Le paquet est entièrement validé avant toute écriture : un texte qui n'est pas
du JSON, un autre `format`, une autre `version` ou une entrée incomplète est
refusé sans modifier la mémoire.

Le paquet peut contenir les préférences de l'opérateur : il se conserve comme
un fichier personnel et ne se publie pas.

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
docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track pokeledger-mcp
```

Le volume `pokeledger-memory` conserve la mémoire de `keep_track` entre les
sessions (voir [Mémoire de l'agent](#mémoire-de-lagent)).

## Utilisation avec Claude Code

```bash
claude mcp add pokeledger -- docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track pokeledger-mcp
```

Ou dans un fichier `.mcp.json` :

```json
{
  "mcpServers": {
    "pokeledger": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "pokeledger-memory:/home/node/.pokeledger/keep-track", "pokeledger-mcp"]
    }
  }
}
```

## Utilisation avec GitHub Copilot

Construire d'abord l'image Docker (voir [Docker](#docker)).

### Copilot CLI et VS Code

Ajouter le serveur à la configuration utilisateur
`~/.copilot/mcp-config.json`, lue par Copilot CLI et par les sessions Copilot de
VS Code :

```bash
copilot mcp add pokeledger -- docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track pokeledger-mcp
```

Ou dans ce fichier, ou dans un fichier `.mcp.json` à la racine du projet :

```json
{
  "mcpServers": {
    "pokeledger": {
      "type": "local",
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "pokeledger-memory:/home/node/.pokeledger/keep-track", "pokeledger-mcp"],
      "tools": ["*"]
    }
  }
}
```

Dans VS Code, un `.mcp.json` à la racine n'est proposé que si le réglage
expérimental `chat.mcp.workspaceRootConfig.enabled` est actif.

VS Code accepte aussi son format historique, dans `.vscode/mcp.json`, avec un
objet `servers` :

```json
{
  "servers": {
    "pokeledger": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "pokeledger-memory:/home/node/.pokeledger/keep-track", "pokeledger-mcp"]
    }
  }
}
```

### Agent cloud Copilot

Un administrateur du dépôt ajoute la configuration dans les réglages MCP du
dépôt sur GitHub. La clé `tools` liste les outils autorisés ; cet exemple exclut
`neuralyze`, qui ne pourrait effacer qu'une mémoire éphémère :

```json
{
  "mcpServers": {
    "pokeledger": {
      "type": "local",
      "command": "docker",
      "args": ["run", "-i", "--rm", "pokeledger-mcp"],
      "tools": ["ping", "start_workflow", "keep_track"]
    }
  }
}
```

L'image n'étant pas publiée, il faut la construire dans
`.github/workflows/copilot-setup-steps.yml`, un fichier qui DOIT être présent sur
la branche par défaut :

```yaml
name: Copilot Setup Steps
on: workflow_dispatch

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t pokeledger-mcp .
```

L'environnement de l'agent cloud est éphémère : un volume Docker n'y conserve
pas la mémoire de `keep_track` d'une session à l'autre.

## Utilisation avec Codex (OpenAI)

Construire d'abord l'image Docker (voir ci-dessus), puis l'ajouter à Codex :

```bash
codex mcp add pokeledger -- docker run -i --rm -v pokeledger-memory:/home/node/.pokeledger/keep-track pokeledger-mcp
```

Ou dans `~/.codex/config.toml` (`.codex/config.toml` pour un projet de
confiance) ; la CLI Codex, l'extension IDE et l'application de bureau
partagent cette configuration :

```toml
[mcp_servers.pokeledger]
command = "docker"
args = ["run", "-i", "--rm", "-v", "pokeledger-memory:/home/node/.pokeledger/keep-track", "pokeledger-mcp"]
```

Pour utiliser un dossier de règles personnalisé :

```toml
[mcp_servers.pokeledger]
command = "docker"
args = ["run", "-i", "--rm", "-v", "pokeledger-memory:/home/node/.pokeledger/keep-track",
        "-v", "/chemin/vers/mes-regles:/rules",
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
