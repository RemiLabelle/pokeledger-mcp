# Audit de la suite de tests

Cet audit s'inspire du skill
[codebase-test-suite-audit](https://tessl.io/registry/sharaf/codebase-test-suite-audit).
Il évalue les tests automatisés existants et produit des constats classés et
un plan de remédiation ; il ne réécrit pas les tests sans demande explicite.

1. **Preuves d'abord** : README, manifestes, configuration des lanceurs de
   tests, CI, dossiers de tests et de données ; recherche de `coverage`,
   `mutation`, `flake`, `retry`, `snapshot`, `mock`, `sleep`, `TODO`, tests
   générés.
2. **Fiche** : domaine, pile, lanceur, couches de tests, garde-fous de CI,
   preuves manquantes.
3. **Tableau des preuves** par domaine : revu, partiel, non fourni, sans objet.
4. **Échantillon** : pour chaque test examiné, l'oracle est-il indépendant ?
   Le test échouerait-il face à une implémentation fautive plausible ?
5. **Raccourcis de classement** : assertion absente ou oracle recopié →
   moyenne ; oracle faible sur un calcul d'argent → élevée ; attente fixe →
   constat d'instabilité ; état partagé mutable → dépendance à l'ordre ;
   données aléatoires sans graine → reproductibilité ; tests générés sans
   preuve d'exécution → non fiables.
6. La couverture, une CI verte ou une documentation ne prouvent pas que les
   tests détectent les fautes. L'agent NE DOIT PAS prétendre avoir revu une
   preuve indisponible.

Chaque constat, quelle que soit sa gravité, DOIT donner : Gravité ; Preuve
vérifiée (chemin:ligne) ; Impact ; Tests ou comportement touchés ; Correction
recommandée ; Vérification.

Le rapport contient : synthèse, preuves revues et lacunes, carte du système de
tests, constats par gravité (une section vide indique « Aucun constat avec les
preuves disponibles »), évaluation par domaine, notes sur les tests générés
par IA, notes sur la CI et l'instabilité, plan de remédiation priorisé avec
étapes de vérification.
