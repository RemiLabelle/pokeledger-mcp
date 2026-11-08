# Vue passive

Ces critères s'inspirent du skill
[headless-architecture](https://tessl.io/registry/jpc0/headless-architecture).
L'agent vérifie que le code d'interface :

1. affiche seulement le modèle de vue courant et envoie des commandes typées ;
2. ne contient aucune logique métier (contrôle de droits, calcul, règle) : une
   telle logique DOIT être signalée et déplacée dans le cœur, exposée par une
   propriété du modèle de vue ;
3. limite sa validation à l'ergonomie (champ requis, format) et affiche les
   erreurs de validation renvoyées par le cœur ;
4. ne reçoit que des DTO, jamais d'objets internes du cœur ;
5. désigne les ressources lourdes par identifiant et laisse le cœur les
   résoudre.
