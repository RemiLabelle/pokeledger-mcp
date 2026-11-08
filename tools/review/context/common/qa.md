# Assurance qualité

Ces règles s'inspirent du skill
[qa-expert](https://tessl.io/registry/skills/github/fernandezbaptiste/claude-code-skills/qa-expert).

## Cas de test

Un cas de test manquant est décrit au format AAA : prérequis (Arrange),
étapes (Act), résultats attendus (Assert), identifiant `TC-<CATÉGORIE>-<NUMÉRO>`,
priorité et cas limites.

## Bogues

Un bogue est consigné avec un identifiant séquentiel (`BUG-001`), des étapes de
reproduction numérotées, l'environnement et une gravité :

- **P0** bloquant : faille de sécurité, fonction principale cassée ou perte de
  données ;
- **P1** critique : fonction majeure cassée, avec contournement ;
- **P2** élevée : fonction mineure ou cas limite ;
- **P3** moyenne : défaut esthétique ;
- **P4** faible : coquille de documentation.

Un P0 DOIT être signalé à l'opérateur immédiatement.

## Sécurité

L'agent DOIT vérifier le changement contre l'OWASP Top 10 : contrôle d'accès,
défaillances cryptographiques, injection, conception non sûre, mauvaise
configuration, authentification, intégrité des données, journalisation, SSRF.
Chaque test de sécurité suit le format AAA et documente son vecteur d'attaque
(`TC-SEC-<NUMÉRO>`).

## Seuils de livraison

Aucun P0 ouvert et au plus 5 P1. Le seuil de couverture est celui des règles
de travail (100 %), pas celui du skill d'origine.
