# Versionnage

Ces règles s'appliquent à toute tâche de code principale confiée à l'agent.

- Avant de commencer, l'agent DOIT vérifier que l'arbre de travail est propre
  (`git status`), puis DOIT créer une branche de travail selon les conventions
  Git.
- L'agent NE DOIT PAS committer directement sur `main` ni sur `develop`.
- L'agent DOIT committer immédiatement après chaque sous-fonctionnalité,
  correctif, tâche de maintenance (`chore`) ou documentation sémantiquement
  terminé. Il NE DOIT PAS regrouper plusieurs unités de travail dans un même
  commit.
- Chaque commit DOIT correspondre à une seule unité sémantique et DOIT suivre
  le format des conventions Git (`<type>(<scope>): <description>`, en anglais,
  à l'impératif).
- Hormis le commit qui ajoute les tests validés d'une tâche (voir Workflow
  TDD), un commit NE DOIT PAS casser les tests existants.
- Les messages de commit NE DOIVENT PAS contenir de ligne `Co-Authored-By:` ni
  aucune autre mention de co-auteur ou d'attribution.

## Versionnage local uniquement

- Le versionnage DOIT se faire exclusivement en local (branches et commits).
- L'agent NE DOIT PAS exécuter `git push`, sous quelque forme que ce soit,
  même si l'opérateur ou les conventions Git le suggèrent. Le push reste à la
  charge de l'opérateur.
- L'agent NE DOIT PAS exécuter les étapes des conventions Git qui contactent
  le dépôt distant (`git pull origin …`, `git push -u origin …`) ; il DOIT
  créer la branche de travail à partir de la branche de base locale.
