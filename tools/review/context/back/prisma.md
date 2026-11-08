# Prisma

Ces critères s'inspirent du skill
[prisma-best-practices](https://tessl.io/registry/tessl-labs/prisma-best-practices).

**Schéma.** URL de la base lue par `env("DATABASE_URL")` ; montants en
centimes (`Int`), jamais `Float` ; énumérations pour les ensembles finis ;
`createdAt` et `@updatedAt` sur chaque modèle ; `@@index` sur chaque clé
étrangère et colonne filtrée ; `onDelete: Cascade` quand la suppression doit
se propager.

**Client.** Une seule instance réutilisée (singleton) ; `connection_limit` et
`pool_timeout` réglés, `connection_limit=1` en serverless ; journaux réduits à
`error` en production.

**Requêtes.** `select` pour les listes, `include` pour le détail, jamais les
deux au même niveau ; pas de requête de relation dans une boucle (N+1) ;
`createMany`, `updateMany`, `deleteMany` plutôt que des boucles.

**Transactions.** Dans `$transaction(async (tx) => …)`, toutes les opérations
passent par `tx`, jamais par `prisma` ; `maxWait` et `timeout` relevés pour les
traitements longs.

**Erreurs.** `P2002` → conflit, `P2025` → absence, `P2003` et `P2014`
traités ; toute autre erreur relancée.

**SQL brut.** `$queryRaw` avec gabarit étiqueté seulement ; jamais
`$queryRawUnsafe` ni interpolation avec une entrée utilisateur ; `Prisma.sql`
pour les identifiants dynamiques.

**Migrations.** `migrate dev` en développement, `migrate deploy` en
production, `db push` réservé au prototypage ; fichiers de migration commités
et jamais modifiés à la main.

**Tests.** Base de test distincte (`.env.test`), nettoyage des enfants vers les
parents puis données connues en `beforeEach`, `$disconnect()` en `afterAll`.
