# Architecture

## Structure

```text
src/index.js                  point d'entrée HTTP (lit PL_MCP_TOKEN)
src/http.js                   serveur HTTP, sessions MCP, coupure des requêtes non authentifiées
src/auth.js                   garde bearer (comparaison en temps constant)
src/activate/                 commande locale `npm run activate` (génération du jeton)
  index.js, texts.js, context/ logique, gabarits et messages du terminal
  cli.js                      point d'entrée, exclu de la couverture
src/server.js                 création du serveur, enregistrement des outils publics
test/                         tests de src/
tools/<outil>/                un dossier par outil ou étape interne
  index.js                    déclaration de l'outil ou de l'étape
  *.test.js ou test/          tests de l'outil
tools/start_workflow/
  index.js                    outil public et routage des étapes (`step`)
  context.js                  chargement des fichiers de contexte
  context/                    règles et textes destinés au modèle
  test/fixtures/              dossiers de contexte de test
tools/validate_tests/,
tools/choose_implementation/,
tools/confirm_custom_implementation/
  texts.js                    chargement et rendu des gabarits
  context/                    messages à l'opérateur et à l'agent
```

## Du code à l'exposition publique

Le code d'un outil traverse sept couches, de la plus basse à la plus haute.
Chaque couche ne connaît que celle du dessous.

```text
context/*.md, strings.json      1. textes paramétrables
        │  lus par
texts.js / context.js           2. chargement et rendu
        │  utilisés par
tools/<étape>/index.js          3. logique de l'étape (objet step)
        │  routé par
tools/start_workflow/index.js   4. outil public (registerTool)
        │  enregistré par
src/server.js                   5. serveur MCP
        │  une instance par session, derrière
src/auth.js → src/http.js       6. garde bearer et transport Streamable HTTP
        │  démarré par
src/index.js                    7. point d'entrée (PL_MCP_TOKEN)
```

### 1. Textes paramétrables — `tools/<outil>/context/`

Tout ce qui est destiné au modèle ou à l'opérateur vit dans des fichiers
Markdown ou JSON, jamais dans le code :

- `start_workflow` : les règles (`terminology.md`, `tdd.md`…), les
  instructions du serveur et la description de l'outil, déclarées dans
  `manifest.json` ;
- étapes internes : la description de l'étape (`tool-description.md`), les
  gabarits de messages (`request.md`, `validated.md`…) avec des emplacements
  `{{clé}}`, les libellés du formulaire (`strings.json`) et, pour
  `validate_tests`, le skill de développement (`development-skill.md`).

Modifier un comportement rédactionnel revient à modifier ces fichiers.

### 2. Chargement et rendu — `texts.js` et `context.js`

- `context.js` (`start_workflow`) lit le manifeste, assemble les sections
  demandées dans l'ordre du manifeste (`buildContext`) et fournit les
  instructions et la description (`loadServerTexts`). Le dossier peut être
  remplacé par la variable `POKELEDGER_START_WORKFLOW_CONTEXT_DIR`.
- `texts.js` (une copie par étape) charge les gabarits de l'étape
  (`loadTexts`, d'après sa table `TEMPLATE_FILES`) et remplace les `{{clé}}`
  connues (`renderTemplate`).

Les textes des réponses sont relus à chaque appel : une modification
s'applique sans redémarrer. Les descriptions d'outil et les instructions du
serveur sont lues au démarrage.

### 3. Logique de l'étape — `tools/<étape>/index.js`

Chaque étape interne exporte un objet sans dépendance MCP propre :

```js
export const validateTests = {
  name: "validate_tests",                    // valeur de `step`
  description: loadTexts().toolDescription,  // documentation pour l'agent
  inputSchema: z.object({ /* … */ }),        // contrat d'entrée (zod)
  async run(server, input) { /* … */ },      // logique
};
```

`run` construit le message à partir des gabarits, ouvre le formulaire de
l'opérateur par élicitation MCP (`server.server.elicitInput`), puis traduit
la réponse en résultat : un texte de consigne pour l'agent (`content`) et un
état exploitable par programme (`structuredContent.status`). Les fonctions
d'aide (`operatorForm`, `reply`, `bullets`) restent privées au module.

### 4. Outil public — `tools/start_workflow/index.js`

`registerStartWorkflow` est le seul point qui transforme du code en outil
MCP, avec `ping` :

1. la table `STEPS` réunit les objets étape par leur `name` ;
2. `registerTool("start_workflow", …)` déclare le schéma public : `sections`,
   `step` (énumération des noms de `STEPS`, dont la description concatène la
   documentation de chaque étape) et `input` ;
3. à l'appel, sans `step`, l'outil renvoie les règles (`buildContext`) ; avec
   `step`, `runStep` valide `input` contre l'`inputSchema` de l'étape et
   renvoie une erreur lisible (`isError`) sans solliciter l'opérateur si
   l'entrée est invalide, sinon appelle `run`.

Une étape n'est donc jamais listée comme outil : elle n'est atteignable que
par `start_workflow`.

### 5. Serveur MCP — `src/server.js`

`createServer` crée le `McpServer` avec les instructions issues du contexte
et enregistre uniquement les outils publics (`registerPing`,
`registerStartWorkflow`). Il ignore tout du transport et de
l'authentification : les tests des outils s'y connectent directement par
`InMemoryTransport`.

### 6. Authentification et transport — `src/auth.js` et `src/http.js`

- `createBearerGuard(token)` renvoie la garde `(authorization) => boolean` :
  format strict `Bearer <jeton>` (schéma insensible à la casse), comparaison
  par `timingSafeEqual` sur les empreintes SHA-256, donc sans fuite de
  longueur ni de contenu. Elle refuse d'être créée sans jeton.
- `createHttpServer({ token, contextDir })` renvoie un `http.Server` non
  démarré. La garde s'applique **avant tout routage** : sans jeton valide, le
  socket est détruit sans réponse. Les réponses automatiques de Node sont
  neutralisées : `clientError` coupe la connexion au lieu d'envoyer 400 ou
  431, et `checkContinue` n'envoie `100 Continue` qu'à un client
  authentifié. Ensuite, seul `/mcp` est servi (404 vide
  sinon) ; chaque session a son propre `StreamableHTTPServerTransport` et son
  propre `createServer()`, indexés par `mcp-session-id`. Les sessions avec
  état sont nécessaires à l'élicitation : la réponse de l'opérateur arrive
  dans une autre requête POST que l'appel d'outil.

### 7. Point d'entrée — `src/index.js`

Lit `PL_MCP_TOKEN` (arrêt silencieux s'il manque), le retire de
l'environnement, puis écoute sur `PL_MCP_HOST:PL_MCP_PORT`. L'image Docker
lance ce fichier. Les clients authentifiés voient alors `ping` et
`start_workflow`.

### Ajouter une étape interne

1. Créer `tools/<étape>/` avec `context/` (textes) et `texts.js`.
2. Exporter depuis `tools/<étape>/index.js` un objet `{ name, description,
   inputSchema, run }`.
3. L'ajouter à la table `STEPS` de `tools/start_workflow/index.js`.

Aucune modification de `src/` n'est nécessaire. Une nouvelle étape publique
(un outil listé) exigerait au contraire une fonction `register<Outil>` appelée
depuis `createServer`.
