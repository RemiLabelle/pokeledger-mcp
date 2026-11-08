# Tests d'API Express

Ces critères s'inspirent du skill
[api-testing-first-steps](https://tessl.io/registry/tessl-labs/api-testing-first-steps),
adaptés aux règles TDD : la portée vient des tests validés et la couverture
visée reste de 100 %.

L'agent vérifie que les tests d'une API Express :

1. passent par HTTP avec supertest (`request(app)`), jamais par appel direct
   des fonctions ; l'application est exportée sans `listen()` en test ;
2. couvrent au moins le chemin nominal, la validation (400), l'absence (404,
   jamais 500), le changement d'état (création puis relecture) et le format
   d'erreur (`error.message` est une chaîne, pour chaque réponse d'erreur) ;
3. utilisent une vraie base isolée (SQLite en mémoire, remise à zéro ou
   transaction annulée par test), sans simuler la base ;
4. pour une modification d'état, créent d'abord la ressource et utilisent son
   identifiant, vérifient la nouvelle valeur et rejettent une valeur invalide ;
5. pour un filtre, vérifient chaque résultat renvoyé, pas seulement le premier ;
6. ne testent ni les rouages d'Express ni des fonctions privées.

Les routes d'argent et de changement d'état DEVRAIENT être relues en premier.
