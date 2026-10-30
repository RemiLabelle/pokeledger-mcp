# Versionnage

Ces règles s'appliquent à toute tâche de code principale confiée à l'agent.

- Avant de commencer : vérifier que l'arbre de travail est propre
  (`git status`), puis créer une branche de travail selon les conventions Git.
- Ne jamais committer directement sur `main` ni sur `develop`.
- Committer **immédiatement** après chaque sous-fonctionnalité, correctif,
  tâche de maintenance (`chore`) ou documentation sémantiquement terminé.
  Ne pas accumuler plusieurs unités de travail dans un même commit.
- Un commit = une unité sémantique, au format défini par les conventions Git
  (`<type>(<scope>): <description>`, en anglais, à l'impératif).
- Hormis le commit qui ajoute les tests d'une tâche (voir Workflow TDD), un
  commit ne doit jamais casser les tests existants.
- Aucun co-auteur : ne jamais ajouter de ligne `Co-Authored-By:` ni aucune
  autre mention d'attribution dans les messages de commit.

## Versionnage local uniquement

- Le versionnage se fait **exclusivement en local** : branches et commits.
- Ne **jamais** exécuter `git push`, sous aucune forme, même si l'utilisateur
  ou les conventions Git le suggèrent. Le push reste à la charge de
  l'utilisateur.
- Les étapes des conventions Git qui contactent le dépôt distant
  (`git pull origin …`, `git push -u origin …`) sont ignorées : créer la
  branche de travail à partir de la branche de base locale.
