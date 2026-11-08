# Sécurité Express

Ces critères s'inspirent du skill
[express-security-basics](https://tessl.io/registry/tessl-labs/express-security-basics).
Ils s'appliquent à toute application Express, même sans demande de sécurité.

1. **Ordre des middlewares** : `trust proxy`, `helmet`, `cors`, limiteurs de
   débit, `express.json` limité, `hpp`, routes, gestionnaire d'erreurs en
   dernier.
2. **Helmet** activé avant les routes ; la CSP n'est désactivée que pour une
   API JSON pure derrière une passerelle.
3. **CORS** : liste d'origines explicite (`ALLOWED_ORIGINS`), jamais `cors()`
   sans argument ni `origin: true` avec `credentials`.
4. **Limitation de débit** : `/api` (15 min, 100), `/api/auth` (15 min, 10),
   écritures (1 min, 20) ; magasin externe (Redis) avec plusieurs processus ;
   le limiteur est placé avant le gestionnaire de la route.
5. **`trust proxy`** réglé au nombre exact de proxys, jamais `true`.
6. **Entrées** : `express.json({ limit: "10kb" })`, paramètres validés (400
   `INVALID_PARAM`), requêtes paramétrées, `hpp`, tris et filtres en liste
   blanche.
7. **Gestionnaire d'erreurs** à quatre arguments, enregistré en dernier : il
   journalise l'erreur complète côté serveur et ne renvoie jamais de trace de
   pile ; une 500 renvoie `INTERNAL_ERROR`.
8. **Sessions** : secret lu dans l'environnement, cookie `__Host-sid`,
   `httpOnly`, `secure` en production, `sameSite: "lax"`, durée de 24 heures.
