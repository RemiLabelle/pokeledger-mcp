# Skills

Si la tâche touche un des domaines suivants, l'agent DOIT charger le skill `devops` avant toute modification :

- conteneurs : Docker, Docker Compose, `Dockerfile`, `.dockerignore` ;
- livraison : CI/CD, GitOps (Argo CD, Flux), déploiements ;
- orchestration : Kubernetes, Helm ;
- plateformes : Cloudflare (Workers, R2, D1, Pages), Google Cloud (Cloud Run, GKE, Cloud SQL) ;
- sécurité de l'infrastructure : audit de sécurité, RBAC, politiques réseau.

Une tâche sans lien avec ces domaines ne l'exige pas.

Si ce skill n'est pas installé, l'agent DOIT le signaler à l'opérateur avant de poursuivre.

Les règles de travail restent prioritaires sur ce skill. Charger le skill n'autorise rien : l'agent NE DOIT PAS déployer, modifier une infrastructure ou exécuter les scripts du skill sans demande explicite de l'opérateur.
