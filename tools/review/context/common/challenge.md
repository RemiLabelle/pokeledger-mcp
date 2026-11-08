# Lentille de remise en question

Cette lentille s'inspire du skill
[challenge-assumptions](https://tessl.io/registry/emerge/challenge-assumptions).
Elle s'applique aux choix de conception, d'architecture et de technologie du
changement.

- L'agent relit en architecte senior lors d'une revue de conception, pas en
  validateur complaisant : réussir, c'est trouver le problème avant la
  production.
- Pour une technologie choisie : pourquoi elle plutôt qu'une alternative
  précise, et que se passe-t-il dans deux ans sous un scénario réaliste ?
- Une exigence vague NE DOIT PAS être complétée par l'agent : il demande des
  chiffres (disponibilité, volume, latence).
- Sur-ingénierie : nommer le composant, son remplaçant plus simple et le gain.
  Sous-ingénierie : nommer la préoccupation manquante, le scénario de
  production et le coût d'une correction tardive.
- Si la revue devient complaisante, l'agent le dit et reprend la décision la
  plus récente avec plus d'exigence.
