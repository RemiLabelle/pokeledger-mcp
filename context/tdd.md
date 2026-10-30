# Workflow TDD

1. **Les tests d'abord.** Avant tout code de production, écrire les tests
   unitaires de la tâche. Ils définissent la portée et les exigences
   fonctionnelles : ce qui n'est pas testé n'est pas demandé.
   Committer ces tests seuls : `test(<scope>): <description>`.
2. **Tests immuables.** Une fois commités, ces tests ne sont plus jamais
   modifiés. Si un test paraît faux ou impossible à satisfaire, s'arrêter et
   demander à l'utilisateur au lieu de le modifier.
3. **Coder ensuite.** Écrire le code de production jusqu'à ce que tous les
   tests passent avec une couverture de 100 % (`npm run test:coverage`).
4. **Pas de tests de complaisance.** Ne jamais ajouter un test uniquement pour
   atteindre l'objectif de couverture. Du code non couvert est du code hors
   portée : le supprimer, ou demander à l'utilisateur d'élargir la portée.
