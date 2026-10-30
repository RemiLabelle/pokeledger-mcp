# Authentification

Le serveur exige le jeton `PL_MCP_TOKEN`, défini dans le fichier `.env` de
l'utilisateur (ignoré par Git et par Docker).

## Obtenir un jeton

```bash
npm run activate
```

La commande génère un jeton de 32 octets aléatoires (base64url) et l'écrit
dans le `.env` du dossier courant :

- sans `.env`, le fichier est créé (mode `0600` hors Windows) ;
- sinon, son contenu et ses fins de ligne sont conservés et `PL_MCP_TOKEN`
  est ajouté, ou rempli s'il était vide ;
- un jeton déjà défini n'est **ni écrasé ni affiché** (code de sortie 1).
  `npm run activate -- --force` le remplace : l'ancien jeton devient
  invalide au redémarrage du serveur.

Le jeton est affiché une seule fois, avec un avertissement **URGENT** : le
conserver dans un gestionnaire de mots de passe est le seul moyen de rétablir
l'accès si le `.env` est perdu. Lancée par un agent, la commande expose le
jeton dans sa conversation.

La commande est purement locale : aucun outil MCP ne délivre de jeton, et le
serveur reste muet envers tout client non authentifié. Redémarrer le serveur
après une activation.

## Comportement du serveur

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
