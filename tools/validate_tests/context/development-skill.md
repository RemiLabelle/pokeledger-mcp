# Skill : développement

Les tests sont validés ; l'agent applique les règles suivantes pendant tout le
développement de la tâche. Les mots-clés en majuscules s'interprètent selon le
BCP 14 [RFC 2119] [RFC 8174].

## Abstraction

1. L'abstraction DOIT être privilégiée : l'agent DOIT dépendre d'interfaces,
   de contrats ou de types abstraits plutôt que d'implémentations concrètes.
2. Une logique répétée ou appelée à varier DOIT être extraite derrière une
   abstraction nommée au lieu d'être dupliquée ou codée en dur.
3. L'agent NE DEVRAIT PAS créer d'abstraction sans variation ni besoin établi
   par les tests ou le code existant (pas d'abstraction spéculative).

## Principes SOLID

L'agent DOIT appliquer les principes SOLID à tout code de production :

- **S — Responsabilité unique** : chaque module, classe ou fonction DOIT avoir
  une seule raison de changer.
- **O — Ouvert/fermé** : un comportement nouveau DOIT pouvoir s'ajouter par
  extension (nouvelle implémentation, nouvelle stratégie) sans modifier le
  code existant qui fonctionne.
- **L — Substitution de Liskov** : toute implémentation d'une abstraction DOIT
  pouvoir la remplacer sans changer le comportement attendu par l'appelant.
- **I — Ségrégation des interfaces** : une interface DOIT rester petite et
  ciblée ; un client NE DOIT PAS dépendre de méthodes qu'il n'utilise pas.
- **D — Inversion des dépendances** : les modules de haut niveau DOIVENT
  dépendre d'abstractions ; les dépendances concrètes DEVRAIENT être injectées
  plutôt qu'instanciées en interne.

## Patrons de conception

1. Tout patron de conception utilisé DOIT être clairement identifiable par au
   moins un des éléments suivants : nom de fichier, nom de classe, nom de
   package (ou dossier) ou nom de méthode.
   - Exemples : `payment-strategy.js`, `class CardPaymentStrategy`,
     `factories/`, `createReport()`, `ReportBuilder`, `EventObserver`,
     `LegacyApiAdapter`.
2. Le nom DOIT reprendre le terme consacré du patron (Strategy, Factory,
   Builder, Adapter, Observer, Decorator, Repository…) pour qu'un lecteur le
   reconnaisse sans lire l'implémentation.
3. L'agent NE DOIT PAS employer le nom d'un patron pour du code qui ne
   l'implémente pas.
4. Si le choix d'un patron relève d'une logique centrale non établie, l'agent
   DOIT suivre la règle des décisions d'implémentation (étape
   `choose_implementation`) avant de l'implémenter.

[RFC 2119]: https://www.rfc-editor.org/rfc/rfc2119
[RFC 8174]: https://www.rfc-editor.org/rfc/rfc8174
