# Idempotence des API

Ces critères s'inspirent du skill
[api-idempotency](https://tessl.io/registry/tessl-labs/api-idempotency).
L'agent DOIT vérifier chaque point pour toute route POST qui crée une
ressource ou déclenche un effet de bord :

1. la route accepte l'en-tête `Idempotency-Key` ;
2. le serveur verrouille la clé (état « en cours ») avant la logique métier ;
3. un doublon concurrent reçoit 409 ;
4. les réponses terminées sont mises en cache avec une expiration (24 heures) ;
5. les réponses 5xx ne sont PAS mises en cache ;
6. les réponses 4xx SONT mises en cache ;
7. une réponse rejouée garde son code d'origine ;
8. la colonne de la clé porte une contrainte d'unicité ;
9. l'interception d'erreur à l'insertion ne masque que l'erreur de doublon.
