# Décisions d'implémentation

1. **Ce qui est établi.** Pendant le développement, l'agent DOIT implémenter
   directement ce qui est clairement établi par les tests validés, la demande
   de l'opérateur ou le code existant.
2. **Ce qui ne l'est pas.** Dès que l'agent doit interpréter ou inventer une
   pièce de logique centrale (fonction, flux de données, structure,
   algorithme, contrat d'interface…), il NE DOIT PAS supposer de solution : il
   DOIT s'arrêter et appeler l'outil `choose_implementation`.
3. **Options proposées.** Chaque option DOIT être un choix éprouvé, le plus
   adapté au problème et le mieux aligné sur le code existant (conventions,
   modules, idiomes). Chaque option DOIT inclure une courte justification et
   un court extrait de code montrant son intégration dans le code. L'option
   recommandée DEVRAIT être proposée en premier.
4. **Attente du choix.** L'agent NE DOIT PAS implémenter cette pièce avant
   d'avoir reçu le choix de l'opérateur.
5. **Implémentation personnalisée.** Si l'opérateur décrit sa propre
   implémentation, l'agent DOIT vérifier qu'elle s'aligne sur le code existant
   et qu'elle n'introduit ni mauvaise odeur de code ni anti-patron.
   - Sans problème relevé, l'agent DOIT l'implémenter telle quelle.
   - Sinon, l'agent DOIT appeler `confirm_custom_implementation` avec la liste
     précise des problèmes. Si l'opérateur poursuit, l'agent DOIT implémenter
     son choix tel quel, sans le réévaluer. S'il annule, l'agent DOIT rappeler
     `choose_implementation` avec les mêmes options.
