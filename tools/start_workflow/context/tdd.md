# Workflow TDD

Ce workflow s'inspire du skill
[tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd)
de Matt Pocock.

1. **Coutures convenues.** Une couture (*seam*) est l'interface publique à
   laquelle un comportement s'observe sans entrer dans le code. Avant d'écrire
   le moindre test, l'agent DOIT lister les coutures visées, avec ce que chacune
   détecte et ce qu'elle laisse passer, et DOIT les faire confirmer par
   l'opérateur. Aucun test NE DOIT être écrit à une couture non confirmée.
2. **Tranches verticales.** L'agent DOIT avancer par tranches : une couture, un
   test, une implémentation minimale par cycle. Il NE DOIT PAS écrire tous les
   tests d'une tâche avant de les implémenter. Chaque tranche DEVRAIT tenir
   compte de ce que la précédente a appris. Les tests définissent la portée et
   les exigences fonctionnelles : un comportement non testé NE DOIT PAS être
   implémenté.
3. **Rouge.** L'agent DOIT écrire le test de la tranche, l'exécuter et DOIT
   vérifier qu'il échoue avant d'écrire du code de production.
4. **Validation par l'opérateur.** Pour chaque tranche, l'agent DOIT
   appeler `start_workflow` avec `step: "validate_tests"` et, dans `input`,
   la tâche, la portée et la liste des cas couverts, puis DOIT agir selon le `status` renvoyé :
   - `rework` : l'agent DOIT retravailler les tests selon les retours de
     l'opérateur, puis DOIT relancer l'étape `validate_tests`, jusqu'à la validation.
   - `not_validated` ou `unavailable` : l'agent NE DOIT PAS commencer le
     développement ; il DOIT demander à l'opérateur, dans la conversation,
     une validation explicite ou ses retours.
   - `validated` : alors seulement, l'agent DOIT committer les tests seuls
     (`test(<scope>): <description>`) et PEUT commencer le développement de la
     tranche.
5. **Tests immuables.** Une fois validés et commités, les tests NE DOIVENT
   PLUS être modifiés. Si un test paraît faux ou impossible à satisfaire,
   l'agent DOIT s'arrêter et demander à l'opérateur au lieu de le modifier.
6. **Vert.** L'agent DOIT écrire uniquement le code nécessaire pour faire passer
   le test de la tranche, sans anticiper les tests suivants, puis DOIT committer.
7. **Couverture.** À la fin de la dernière tranche, tous les tests DOIVENT
   passer avec une couverture de 100 % (`npm run test:coverage`).
8. **Pas de tests de complaisance.** L'agent NE DOIT PAS ajouter de test dans
   le seul but d'atteindre l'objectif de couverture. Du code non couvert est
   hors portée : l'agent DOIT le supprimer ou demander à l'opérateur
   d'élargir la portée.
9. **Refactoring.** Le refactoring ne fait pas partie de la boucle : il relève
   de l'étape de revue.

## Qualité des tests

Chaque test DOIT vérifier un comportement à travers une interface publique, de
sorte qu'il survive à une réécriture interne. Son nom DEVRAIT décrire ce que
fait le code, et non comment il le fait. Les formes suivantes NE DOIVENT PAS
être utilisées :

- **Test couplé à l'implémentation** : il simule un collaborateur interne, teste
  une méthode privée ou vérifie le résultat par un canal détourné. Il casse lors
  d'un refactoring alors que le comportement n'a pas changé.
- **Test tautologique** : sa valeur attendue est recalculée comme le fait le
  code, et il réussit donc par construction. La valeur attendue DOIT venir d'une
  source indépendante : un littéral connu, un exemple travaillé ou la
  spécification.

L'agent NE DOIT simuler (mock) qu'aux frontières du système : API externes,
temps, aléa et, au besoin, base de données ou système de fichiers. Il NE DOIT
PAS simuler ses propres modules. Ces dépendances DEVRAIENT être injectées.
