# Gouvernance

Ces règles s'inspirent du skill
[guv](https://tessl.io/registry/sporkwace/guv). Elles s'appliquent avant toute
modification qui peut être inutile, risquée, architecturale ou qui élargit la
portée de la tâche.

## Contrôle de gouvernance

Avant toute implémentation, l'agent DOIT produire un contrôle de gouvernance
concis qui couvre les sept points suivants :

1. **Objectif de la demande** ;
2. **Défaut, risque ou bénéfice mesurable** concret ;
3. **Évaluation du statu quo** : que se passe-t-il si rien ne change ?
4. **Contraintes d'architecture touchées** ;
5. **Risques ou conflits** ;
6. **Plus petit changement sûr** ;
7. **Test d'acceptation** qui prouvera le changement.

## Statu quo et changement minimal

- Ne rien changer est un résultat valide : sans défaut, risque ou bénéfice
  concret, l'agent DOIT s'arrêter et recommander de ne rien changer.
- L'agent NE DOIT PAS modifier du code au seul motif d'une demande de
  nettoyage, de polissage, de modernisation, de simplification ou de
  refactoring. Un changement DOIT avoir une raison concrète : exactitude,
  sécurité, performance, maintenabilité, sûreté du typage, réduction de la
  duplication, frontière de domaine plus claire, observabilité ou couverture
  de tests.
- L'agent DEVRAIT retenir le plus petit changement sûr. Il NE DEVRAIT PAS
  réécrire du code qui fonctionne pour le style, l'élégance, la nouveauté ou
  une flexibilité future spéculative.

## Classement d'un nettoyage

Avant un nettoyage ou un refactoring, l'agent DOIT classer l'état actuel :

- **A** : déjà clair et correct, aucun changement ;
- **B** : nettoyage mécanique seulement, risque faible ;
- **C** : refactoring structurel justifié par un coût de maintenance concret ;
- **D** : correction de comportement nécessaire.

L'agent NE DOIT poursuivre un changement B, C ou D que si son bénéfice est
explicite.

## Choix d'architecture et prochaine étape

Pour une question d'architecture, de feuille de route ou de prochaine étape,
l'agent DOIT comparer chaque option aux décisions antérieures, aux frontières
de la source de vérité, aux chemins d'écriture, à la couverture de tests et
aux engagements pris auprès de l'opérateur. Pour chaque option, il DOIT dire
pourquoi maintenant, avec quoi elle entre en conflit, ce qu'elle reporte, si
elle élargit la portée et quel est le plus petit test d'acceptation, puis
donner sa recommandation. Il DEVRAIT privilégier la stabilisation ou la
réduction du risque tant que le chemin principal reste incomplet.

## Objection

Face à un changement inutile, une capacité dupliquée, une responsabilité
floue, une abstraction prématurée, une dérive d'architecture, un comportement
non testé ou un élargissement de portée inexpliqué, l'agent DOIT objecter
brièvement, justifier l'objection et proposer une alternative plus sûre.

Le contrôle de gouvernance ne remplace pas les décisions d'implémentation :
l'opérateur reste seul à choisir par l'étape `choose_implementation`.
