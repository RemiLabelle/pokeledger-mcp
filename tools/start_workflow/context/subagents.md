# Développement par sous-agents

Ces règles s'inspirent du skill
[subagent-driven-development](https://tessl.io/registry/skills/github/foryourhealth111-pixel/Vibe-Skills/subagent-driven-development).
Elles s'appliquent lorsque l'agent exécute, dans la session courante, un plan
d'implémentation dont les tâches sont pour la plupart indépendantes. Sans plan,
ou pour des tâches étroitement couplées, l'agent DOIT travailler seul selon le
workflow TDD.

## Préparation

1. L'agent coordinateur lit le plan une seule fois, en extrait toutes les
   tâches avec leur texte complet et leur contexte, et en tient la liste.
2. Le travail se fait sur la branche de travail créée selon les règles de
   versionnage, sans worktree.

## Pour chaque tâche

1. **Implémentation.** Une fois le plan lu, l'agent coordinateur DOIT confier chaque tâche à un
   nouveau sous-agent implémenteur, avec le texte complet de la tâche et son
   contexte. Il NE DOIT PAS lui demander de lire le fichier du plan.
2. **Questions.** L'agent coordinateur DOIT répondre entièrement aux questions
   du sous-agent avant qu'il ne poursuive, en ajoutant le contexte manquant.
3. **Règles de travail.** Le sous-agent implémenteur DOIT appliquer toutes les
   règles de travail, dont le workflow TDD et l'étape `validate_tests` avec
   l'opérateur, les conventions Git et les décisions d'implémentation.
4. **Revue de conformité.** L'agent coordinateur DOIT lancer une revue de
   conformité à la spécification par un sous-agent relecteur, qui renvoie une
   approbation ou la liste de ce qui manque et de ce qui est en trop, avant la
   revue de qualité.
5. **Revue de qualité.** La revue de qualité DOIT passer par l'outil
   `review_back`, `review_front` ou les deux, selon le code touché.
6. **Boucles de revue.** Chaque problème relevé est corrigé par le même
   implémenteur, puis la revue est relancée, jusqu'à approbation. L'agent
   coordinateur NE DOIT PAS passer à la tâche suivante tant qu'une revue a des
   problèmes ouverts.

## Interdits

- L'agent coordinateur NE DOIT PAS lancer plusieurs sous-agents implémenteurs
  en parallèle.
- Il NE DOIT PAS sauter une revue, accepter une conformité approximative ni
  laisser une auto-relecture remplacer une revue.
- Si un sous-agent échoue sur une tâche, l'agent coordinateur DOIT confier la
  correction à un sous-agent de correction plutôt que de corriger lui-même.

Une fois toutes les tâches terminées, l'agent coordinateur DOIT lancer une
dernière revue de l'ensemble par `review_back`, `review_front` ou les deux.
