# Audit d'architecture

Cet audit s'inspire du skill
[software-architecture-audit](https://tessl.io/registry/sharaf/software-architecture-audit).
Il remplace la revue du changement par un audit du dépôt ou du périmètre
demandé, fondé sur des preuves.

1. **Fiche du dépôt.** Lire le README, les manifestes, les ADR, la
   documentation des modules et les dossiers sources (frontières, injection,
   adaptateurs, utilitaires partagés, tests). Noter le langage, le périmètre,
   la carte des modules, les racines de composition et l'organisation des
   tests.
2. **Mode.** `single-auditor` pour un chemin ou un sous-système,
   `specialist-panel` pour tout le dépôt : quatre spécialistes (frontières et
   couches ; dépendances et composition ; odeurs et friction au changement ;
   testabilité et points d'ancrage du refactoring), chacun avec la même fiche,
   dans des sous-agents lorsque c'est possible. Le mode DOIT être écrit tel
   quel : `Audit mode: single-auditor` ou `Audit mode: specialist-panel`.
3. **Preuves.** Lire les fichiers avant d'affirmer : sens des dépendances,
   fuites de frontières, utilitaires fourre-tout, classes divines, chirurgie au
   fusil, abstractions spéculatives, fuites d'infrastructure, tests qui
   bloquent le refactoring.
4. **Synthèse.** Classer par effet de levier, pas par pureté ; regrouper les
   symptômes sous leur cause racine ; chaque constat dans une seule section,
   avec gravité, preuve, enjeu, amélioration recommandée et surface de
   refactoring. Ce qui reste ambigu va dans les lacunes de preuve.

Le rapport DOIT contenir exactement ces sections, dans cet ordre, sans tableau
de notes ni section de points forts :

```markdown
## Repo Brief
## Highest-Leverage Structural Issues
## Boundary and Layering Problems
## Dependency and Composition Problems
## Testability and Change Friction
## Improvement Sequence
## Open Evidence Gaps
```

La séquence d'amélioration est numérotée ; chaque étape donne son but et
pourquoi elle vient à ce rang.
