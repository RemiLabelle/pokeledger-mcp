# Tests Jest

Ces critères s'inspirent du skill
[jest-testing](https://tessl.io/registry/tessl-labs/jest-testing), adaptés aux
règles TDD : seules les frontières du système sont simulées, et l'injection des
dépendances est retenue plutôt que `jest.mock` au niveau du module.

Pour du code testé avec Jest, l'agent vérifie que :

1. `jest.clearAllMocks()` (ou `restoreAllMocks`) est dans `beforeEach`, jamais
   dans `afterEach` ;
2. les valeurs propres à un test passent par `mockResolvedValueOnce` ou
   `mockReturnValueOnce` ;
3. un simulacre critique est vérifié par `toHaveBeenCalledWith` et
   `toHaveBeenCalledTimes` ;
4. une assertion conditionnelle ou dans un rappel est protégée par
   `expect.assertions(n)` ;
5. l'asynchrone utilise `async`/`await`, et un rejet
   `await expect(fn()).rejects.toThrow(…)` plutôt qu'un `try`/`catch` ;
6. les minuteries simulées sont activées dans `beforeEach` et restaurées dans
   `afterEach` ;
7. un `describe` par module, un `describe` imbriqué par fonction, des noms de
   tests qui commencent par un verbe ;
8. aucun `test.only` ni `describe.only` n'est commité ;
9. le module testé, les utilitaires purs et la base des tests d'intégration ne
   sont pas simulés.
