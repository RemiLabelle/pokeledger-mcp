# Politiques RLS

Ces critères s'inspirent du skill
[rls-policy-optimization](https://tessl.io/registry/g14wxz/rls-policy-optimization).
Ils s'appliquent aux politiques Row Level Security de PostgreSQL.

1. Un appel d'authentification dans une politique est enveloppé dans une
   sous-requête (`(SELECT auth.uid())`) pour être évalué une seule fois.
2. Chaque colonne utilisée dans une expression de politique est indexée.
3. Une jointure profonde dans une politique est déplacée dans une fonction
   d'aide `SECURITY DEFINER` avec `SET search_path`.
4. Une fonction `SECURITY DEFINER` s'exécute avec les droits de son
   propriétaire et peut contourner la RLS : l'agent DOIT signaler toute
   fonction de ce type dont l'exécution n'est pas restreinte (`REVOKE` /
   `GRANT` explicites) ou qui renvoie plus qu'un booléen d'accès.
5. Ces critères optimisent des politiques existantes ; ils ne remplacent pas
   la revue de l'isolation entre locataires.
