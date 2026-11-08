# Skill : développement

Les tests sont validés ; l'agent applique les règles suivantes pendant tout le
développement de la tâche. Les mots-clés en majuscules s'interprètent selon le
BCP 14 [RFC 2119] [RFC 8174].

## Principes de conception

Ces règles s'inspirent du skill
[software-design-principles](https://tessl.io/registry/pantheon-ai/software-design-principles).

1. **Nature de la décision.** L'agent DOIT d'abord classer une décision de
   conception : architecturale, tactique ou fondamentale. Architecturale :
   frontières de services, sens des dépendances, structure des modules.
   Tactique : conception d'une fonction, d'un module ou d'une interface.
   Fondamentale : fonctionnalités du langage, outillage, stratégie de test.
2. **Décisions architecturales.** Les dépendances DOIVENT pointer vers
   l'intérieur, avec aucune dépendance circulaire. Chaque contrat a un
   propriétaire clair et les entités restent pures, sans fuite
   d'infrastructure.
3. **Décisions tactiques.** L'agent DOIT vérifier chaque principe SOLID par sa
   question et réagir à son signal :
   - **SRP** : une seule raison de changer ? Plusieurs préoccupations → découper.
   - **OCP** : extensible sans modifier le code stable ? Sinon → introduire une
     abstraction.
   - **LSP** : les sous-types respectent-ils le contrat de base ? Sinon →
     revoir la hiérarchie.
   - **ISP** : les clients n'utilisent-ils que ce dont ils dépendent ? Sinon →
     découper l'interface.
   - **DIP** : dépend-on d'abstractions ? Couplage concret direct → introduire
     un port.
4. **Patrons.** Un patron NE DOIT être introduit que s'il résout un problème
   concret actuel et retire plus de complexité qu'il n'en ajoute. Tout patron
   utilisé DOIT rester identifiable par son nom (fichier, fonction, objet ou
   dossier) et reprendre son terme consacré ; l'agent NE DOIT PAS employer le
   nom d'un patron pour du code qui ne l'implémente pas. Si le choix d'un patron
   relève d'une logique centrale non établie, l'agent DOIT suivre l'étape
   `choose_implementation`.
5. **Interdits.**
   - L'agent NE DOIT PAS concevoir pour des besoins futurs imaginés : il résout
     le besoin actuel et refactorise quand le besoin apparaît.
   - Il NE DOIT PAS créer de classes ou services fourre-tout.
   - Il NE DOIT PAS optimiser avant d'avoir mesuré une référence.
   - Il NE DOIT PAS coder en dur la configuration ou des secrets.
   - Il NE DOIT PAS contourner un contrat d'interface : il dépend d'un port et
     injecte l'implémentation.
   - Il DOIT typer l'inconnu en `unknown`, puis le restreindre, plutôt que `any`
     ou `@ts-ignore` répétés.

## Architecture cœur / vue

Ces règles s'inspirent du skill
[headless-architecture](https://tessl.io/registry/jpc0/headless-architecture).

1. Le cœur porte la logique métier et l'état, sans aucun code d'interface : il
   reste indépendant de tout framework d'interface.
2. Le cœur reçoit des commandes typées, fait évoluer l'état et expose des
   modèles de vue en lecture seule. Entre le cœur et la vue ne passent que des
   DTO, jamais d'objets internes (connexion à la base, par exemple).
3. La vue passive se contente de deux choses : elle affiche le modèle de vue et
   envoie des commandes. Une validation d'ergonomie (champ requis, format) PEUT
   y vivre, mais toute validation critique pour le métier DOIT vivre dans le
   cœur, qui expose ses erreurs à la vue.
4. L'agent commence par le cœur, définit explicitement le contrat entre cœur et
   vue, puis construit la vue.
5. Si l'on demande de placer de la logique métier dans un composant d'interface
   (un contrôle de droits, par exemple), l'agent DOIT la placer dans le cœur et
   l'exposer par une propriété du modèle de vue.

## Surcouche backend

Cette surcouche s'applique uniquement au code backend. Elle complète la base
commune ; en cas de conflit sur le code backend, elle l'emporte.

### Style TypeScript

Ces règles s'inspirent du skill
[simple-typescript](https://tessl.io/registry/skills/github/idrevnii/perks/simple-typescript).
Les conventions locales du projet restent prioritaires sur ces préférences.

1. TypeScript direct et fonctionnel : fonctions nommées, petits modules, objets
   simples exportés pour regrouper ; pas de classe sans raison forte
   (intégration imposée par un framework, instance à état réel, convention
   locale).
2. L'agent n'écrit ni fabrique, ni enveloppe, ni fonction d'aide triviale qui ne fait que
   renommer un appel. Une fonction d'aide se justifie si elle retire une vraie
   duplication, isole un comportement non trivial ou nomme un concept métier.
   L'agent DEVRAIT préférer la duplication plutôt qu'une mauvaise abstraction.
3. Les utilitaires transverses (client HTTP, gestion des erreurs) vont dans des
   modules partagés ; une configuration simple passe par des paramètres
   optionnels avec valeurs par défaut.
4. `type` par défaut ; `interface` seulement pour un contrat public destiné à
   être étendu ou implémenté. Schémas réutilisables dans `schemas.ts`, types
   réutilisables dans `types.ts`, sans découpage prématuré.
5. Un échec récupérable (E/S, validation, frontière) DOIT être renvoyé comme
   une union discriminée avec un champ `tag` (`success`, `not_found`…), jamais
   comme un `null` vague ; on ne lève une exception que pour une erreur de
   programmation ou un état impossible.
6. Les données non fiables : les valider une seule fois à la frontière, puis
   passer des valeurs typées et sûres vers l'intérieur.

### Idempotence des API

Ces règles s'inspirent du skill
[api-idempotency](https://tessl.io/registry/tessl-labs/api-idempotency).

1. Toute route POST qui crée une ressource ou déclenche un effet de bord DOIT
   être protégée contre les doublons, même sans demande explicite. GET, PUT,
   PATCH et DELETE sont naturellement idempotents.
2. Le client envoie une clé UUID, générée avant la requête et réutilisée à
   chaque nouvel essai, dans l'en-tête `Idempotency-Key`.
3. Le serveur DOIT verrouiller la clé avant le traitement (état « en cours ») :
   - clé en cours : réponse 409, sans mise en file ni abandon silencieux ;
   - clé terminée et non expirée : renvoi de la réponse en cache ;
   - clé nouvelle ou expirée : verrouillage, traitement, stockage.
4. Les réponses 5xx NE DOIVENT PAS être mises en cache : la clé est supprimée
   pour permettre un nouvel essai. Les réponses 4xx DOIVENT être mises en cache
   avec leur code d'origine, jamais remplacé par 200.
5. Chaque entrée DOIT expirer, en standard après 24 heures.
6. En base, la colonne de la clé porte une contrainte d'unicité ; à l'insertion,
   seule l'erreur de doublon est interceptée (renvoi de la ligne existante),
   toute autre erreur est relancée. Une base partagée réserve la clé de façon
   atomique (`INSERT … ON CONFLICT DO NOTHING RETURNING`).

[RFC 2119]: https://www.rfc-editor.org/rfc/rfc2119
[RFC 8174]: https://www.rfc-editor.org/rfc/rfc8174
