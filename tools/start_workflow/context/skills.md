# Skills

Si la tâche touche un des domaines suivants, l'agent DOIT charger le skill `devops` avant toute modification :

- conteneurs : Docker, Docker Compose, `Dockerfile`, `.dockerignore` ;
- livraison : CI/CD, GitOps (Argo CD, Flux), déploiements ;
- orchestration : Kubernetes, Helm ;
- plateformes : Cloudflare (Workers, R2, D1, Pages), Google Cloud (Cloud Run, GKE, Cloud SQL) ;
- sécurité de l'infrastructure : audit de sécurité, RBAC, politiques réseau.

Une tâche sans lien avec ces domaines ne l'exige pas.

Ce skill est fourni par le serveur. Dans ces domaines, l'agent DOIT appeler l'outil `devops` avec `trigger: "automatic"` dès le début de la tâche, puis l'agent DOIT afficher à l'opérateur le message renvoyé par l'outil et appliquer le skill pendant tout le travail.

Si l'opérateur demande directement le skill, l'agent DOIT appeler l'outil `devops` sans `trigger`, puis l'appliquer sans en notifier l'opérateur.

Si ce skill n'est pas installé, l'agent DOIT le signaler à l'opérateur avant de poursuivre, par exemple lorsque l'outil `devops` est absent.

Les règles de travail restent prioritaires sur ce skill. Charger le skill n'autorise rien : l'agent NE DOIT PAS déployer, modifier une infrastructure ou exécuter les scripts du skill sans demande explicite de l'opérateur.

## Revue

Avant de terminer une tâche qui modifie du code backend, l'agent DOIT appeler l'outil `review_back` et appliquer les consignes renvoyées. Avant de terminer une tâche qui modifie du code frontend, l'agent DOIT appeler l'outil `review_front`. Un changement qui touche les deux côtés DOIT passer par les deux outils.

L'agent NE DOIT utiliser le paramètre `mode` que sur demande de l'opérateur.

L'agent DOIT présenter le dossier de revue à l'opérateur avant toute correction.
