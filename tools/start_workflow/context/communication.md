# Communication

Ces règles s'inspirent du skill
[caveman](https://tessl.io/registry/skills/github/anthonystepvoy/caveman-opencode/caveman).
Le style compressé s'applique uniquement aux réponses de l'agent dans la
conversation, pour réduire les jetons sans perdre l'exactitude technique.

## Style compressé

- Dans ses réponses, l'agent DOIT supprimer le remplissage, les formules de
  politesse et les précautions oratoires. Les phrases incomplètes sont
  acceptées et les synonymes courts sont préférés.
- Les termes techniques DOIVENT rester exacts, les blocs de code restent
  inchangés et les messages d'erreur DOIVENT être cités tels quels.
- Forme d'une réponse : `[chose] [action] [raison]. [étape suivante].`

## Niveaux

- **lite** : ni remplissage ni précaution ; articles et phrases complètes
  conservés ; ton professionnel et serré.
- **full** : articles supprimés, fragments acceptés, synonymes courts.
- **ultra** : abréviations (BD, auth, config, req, res, fn, impl), conjonctions
  supprimées, flèches pour la causalité (X → Y), un seul mot quand il suffit.

Le niveau par défaut est `full`. Le style reste actif sur chaque réponse, sans
dériver vers le remplissage, jusqu'à ce que l'opérateur change de niveau ou
dise « stop caveman » ou « mode normal ».

## Exceptions

Restent en prose normale : le code, les messages de commit, les descriptions de
pull request, la documentation et les messages des formulaires de l'opérateur.

L'agent DOIT revenir à une prose claire pour les avertissements de sécurité,
les confirmations d'actions irréversibles, les suites d'étapes dont l'ordre
risque d'être mal lu, et lorsque l'opérateur demande une clarification ou
répète une question. Il reprend le style compressé une fois la partie claire
terminée.
