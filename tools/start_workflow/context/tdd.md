# Workflow TDD

1. **Les tests d'abord.** L'agent DOIT écrire les tests unitaires de la tâche
   avant tout code de production. Ces tests définissent la portée et les
   exigences fonctionnelles : un comportement non testé NE DOIT PAS être
   implémenté.
2. **Validation par l'opérateur.** Une fois les tests écrits, l'agent DOIT
   appeler l'outil `validate_tests` avec la tâche, la portée et la liste des
   cas couverts, puis DOIT agir selon le `status` renvoyé :
   - `rework` : l'agent DOIT retravailler les tests selon les retours de
     l'opérateur, puis DOIT rappeler `validate_tests`, jusqu'à la validation.
   - `not_validated` ou `unavailable` : l'agent NE DOIT PAS commencer le
     développement ; il DOIT demander à l'opérateur, dans la conversation,
     une validation explicite ou ses retours.
   - `validated` : alors seulement, l'agent DOIT committer les tests seuls
     (`test(<scope>): <description>`) et PEUT commencer le développement.
3. **Tests immuables.** Une fois validés et commités, les tests NE DOIVENT
   PLUS être modifiés. Si un test paraît faux ou impossible à satisfaire,
   l'agent DOIT s'arrêter et demander à l'opérateur au lieu de le modifier.
4. **Développement.** L'agent DOIT écrire le code de production jusqu'à ce que
   tous les tests passent avec une couverture de 100 %
   (`npm run test:coverage`).
5. **Pas de tests de complaisance.** L'agent NE DOIT PAS ajouter de test dans
   le seul but d'atteindre l'objectif de couverture. Du code non couvert est
   hors portée : l'agent DOIT le supprimer ou demander à l'opérateur
   d'élargir la portée.
