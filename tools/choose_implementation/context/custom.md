L'opérateur propose sa propre implémentation :

{{custom}}

Avant de l'appliquer, l'agent DOIT vérifier qu'elle s'aligne sur le code
existant et qu'elle n'introduit ni mauvaise odeur de code (code smell) ni
anti-patron.
- Si aucun problème n'est relevé, l'agent DOIT l'implémenter telle quelle.
- Sinon, l'agent DOIT lancer l'étape `confirm_custom_implementation` de `start_workflow` avec la liste
  précise des problèmes relevés et NE DOIT PAS l'implémenter avant la réponse
  de l'opérateur.
