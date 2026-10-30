# Workflow TDD

1. **Les tests d'abord.** Avant tout code de production, écrire les tests
   unitaires de la tâche. Ils définissent la portée et les exigences
   fonctionnelles : ce qui n'est pas testé n'est pas demandé.
2. **Validation par l'opérateur.** Une fois les tests écrits, appeler l'outil
   `validate_tests` avec la tâche, la portée et la liste des cas couverts.
   - `rework` : retravailler les tests selon les retours de l'opérateur, puis
     rappeler `validate_tests`. Recommencer jusqu'à la validation.
   - `not_validated` ou `unavailable` : ne pas développer ; demander à
     l'opérateur, dans la conversation, une validation explicite ou ses
     retours.
   - `validated` : seulement alors, committer les tests seuls
     (`test(<scope>): <description>`) et passer au développement.
3. **Tests immuables.** Une fois validés et commités, ces tests ne sont plus
   jamais modifiés. Si un test paraît faux ou impossible à satisfaire,
   s'arrêter et demander à l'opérateur au lieu de le modifier.
4. **Coder ensuite.** Écrire le code de production jusqu'à ce que tous les
   tests passent avec une couverture de 100 % (`npm run test:coverage`).
5. **Pas de tests de complaisance.** Ne jamais ajouter un test uniquement pour
   atteindre l'objectif de couverture. Du code non couvert est du code hors
   portée : le supprimer, ou demander à l'opérateur d'élargir la portée.
