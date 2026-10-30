# Authentification

Le serveur exige le jeton `PL_MCP_TOKEN`, défini dans le fichier `.env` de
l'utilisateur (ignoré par Git et par Docker) :

```bash
echo "PL_MCP_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")" > .env
```

- **Côté serveur**, `PL_MCP_TOKEN` est la référence. S'il est absent, le
  processus s'arrête (code 1) **sans aucune sortie**.
- **Côté client**, chaque requête porte `Authorization: Bearer <PL_MCP_TOKEN>`.
- Toute requête sans jeton valide, quels que soient la route et la méthode,
  voit sa connexion **coupée sans un octet de réponse** : ni 401, ni
  `WWW-Authenticate`, ni corps. Un client non authentifié ne reçoit ni les
  instructions ni la liste des outils, et ne peut pas savoir qu'un serveur
  MCP écoute. Ce choix s'écarte volontairement du RFC 6750.
- La comparaison se fait en temps constant sur les empreintes SHA-256 des
  jetons ; un identifiant de session ne remplace jamais le jeton.
- Le point d'accès MCP est `/mcp` ; une requête authentifiée sur une autre
  route reçoit un 404 vide.

| Variable       | Défaut      | Rôle                               |
| -------------- | ----------- | ---------------------------------- |
| `PL_MCP_TOKEN` | aucun       | Jeton bearer (obligatoire)         |
| `PL_MCP_HOST`  | `127.0.0.1` | Interface d'écoute (`0.0.0.0` dans l'image) |
| `PL_MCP_PORT`  | `3000`      | Port d'écoute                      |

Le jeton circule en clair sur HTTP : n'exposer le port que sur la boucle
locale, ou placer un proxy TLS devant le serveur.
