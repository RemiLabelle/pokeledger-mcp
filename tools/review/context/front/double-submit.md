# Double envoi

Ces critères reprennent la partie client du skill api-idempotency. Pour chaque
formulaire ou action qui envoie une requête POST créant une ressource,
l'agent vérifie que :

1. le bouton d'envoi est désactivé pendant la requête et son libellé indique
   l'attente ; il est réactivé avec son libellé d'origine dans un bloc
   `finally` ;
2. la clé `Idempotency-Key` est générée avant la requête, réutilisée à chaque
   nouvel essai et renouvelée seulement pour une nouvelle opération ;
3. une réponse 409 déclenche une courte attente puis un nouvel essai avec la
   même clé.

Cette protection complète l'idempotence côté serveur, elle ne la remplace pas.
