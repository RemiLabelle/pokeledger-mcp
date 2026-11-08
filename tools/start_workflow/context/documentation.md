# Documentation

Ces règles s'appliquent à toute rédaction de documentation. Elles s'enchaînent
en trois étapes, dans cet ordre : rédaction, correction du contenu, puis
humanisation du `README`.

## 1. Rédaction

### Markdown

Ces règles s'inspirent du skill
[markdown-authoring](https://tessl.io/registry/pantheon-ai/markdown-authoring).

1. Avant d'écrire, l'agent DOIT identifier le type de document (README, guide,
   documentation d'API, journal des modifications) et suivre l'ordre de
   sections propre à ce type. La structure vient avant la formulation.
2. Chaque bloc de code DOIT porter un langage explicite (par exemple
   ` ```bash ` ou ` ```js `).
3. Les niveaux de titre NE DOIVENT PAS sauter de niveau : on descend d'un
   niveau à la fois.
4. Un document DOIT garder un seul style de liste et un format de tableau
   homogène. Un document de plus de 300 lignes DEVRAIT avoir une table des
   matières.
5. L'agent DOIT lancer markdownlint sur les fichiers modifiés et corriger
   jusqu'à zéro erreur : il identifie la règle en cause, corrige la source ou
   ajoute une exception locale justifiée, puis relance. Il NE DOIT PAS
   désactiver une règle de lint de façon globale.

### Schémas

Ces règles s'inspirent du skill
[mermaid-diagrams](https://tessl.io/registry/skills/github/softaworks/agent-toolkit/mermaid-diagrams).

1. Les schémas DOIVENT être écrits en Mermaid, dans un bloc ` ```mermaid `,
   pour être versionnés avec le code.
2. Le type de schéma DOIT correspondre à ce qu'il montre : `classDiagram` pour
   un modèle de domaine, `sequenceDiagram` pour des échanges dans le temps,
   `flowchart` pour un processus ou une décision, `erDiagram` pour un schéma
   de base de données, `stateDiagram-v2` pour un cycle de vie, C4 pour
   l'architecture.
3. L'agent DEVRAIT garder un schéma par concept, partir simple, utiliser des
   noms parlants et donner un titre ou une note qui explique son but. Un
   schéma trop chargé DEVRAIT être découpé en vues ciblées.

### Recherche et sources

Ces règles s'inspirent du skill
[deep-research](https://tessl.io/registry/skills/github/fernandezbaptiste/claude-code-skills/deep-research)
et servent à appuyer les affirmations théoriques.

1. Toute affirmation théorique DOIT être appuyée par au moins une source
   vérifiable, citée juste après l'affirmation.
2. Les sources en conflit DOIVENT être signalées avec les deux références, au
   lieu d'en retenir une en silence.
3. L'agent NE DOIT PAS inventer de source, de statistique ou de citation. Sans
   source disponible, il DOIT le dire.
4. Un document qui cite des sources DOIT les réunir dans une section de
   références en fin de document.

## 2. Correction du contenu

Ces règles s'inspirent du skill
[content-fix](https://tessl.io/registry/skills/github/netwrix/docs/content-fix).

Une fois le texte écrit, à la fin de la rédaction, l'agent DOIT relire et
corriger le contenu :

- ne corriger que ce qui est faux (fait, lien, commande, nom, incohérence),
  sans réécrire le contenu sans rapport ;
- une correction qui changerait le sens du texte DOIT être écartée et signalée
  à l'opérateur ;
- En cas de doute, l'agent DOIT demander à l'opérateur plutôt que de deviner.

Cette étape n'autorise ni push ni mention de co-auteur : les règles de
versionnage restent prioritaires.

## 3. Humanisation du README

Ces règles s'inspirent du skill
[humaniser](https://tessl.io/registry/oh-my-ai/humaniser).

Cette étape s'applique uniquement au `README`, après la correction du contenu,
pour qu'un contributeur humain le comprenne facilement.

1. L'agent DOIT préserver les noms, dates, nombres, citations, URL et
   commandes, les termes imposés et la position de l'auteur.
2. Il DOIT traquer les tics d'écriture d'IA : importance gonflée, attributions
   vagues (« les experts pensent »), vocabulaire d'IA (« de plus »,
   « témoigne de », « met en lumière »), tirets cadratins en série, gras ou
   emojis décoratifs, annonces creuses (« Plongeons dans… »), formules de
   chatbot, précautions empilées, énumérations par trois sans raison.
3. Il DOIT remplacer ces tics par des verbes simples, des acteurs nommés et des
   faits précis, sans changer l'ordre des paragraphes.
4. Il DOIT faire une seconde passe, en lecteur sceptique, pour repérer les tics
   restants ; une phrase déjà claire et humaine reste telle quelle.
5. L'agent NE DOIT PAS ajouter de précision inventée ni remplacer un cliché par
   un autre.
