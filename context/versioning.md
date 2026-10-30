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
- Ne pousser la branche (`git push`) que lorsque l'utilisateur l'autorise.
