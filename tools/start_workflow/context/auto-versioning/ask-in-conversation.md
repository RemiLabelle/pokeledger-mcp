L'opérateur n'a pas répondu à la question sur le versionnage automatique : le formulaire a été refusé, annulé ou n'a pas pu être affiché.
L'agent DOIT demander à l'opérateur, dans la conversation, s'il doit versionner automatiquement selon le workflow défini, avant toute opération Git.
L'agent DOIT ensuite rappeler `start_workflow` avec le paramètre `autoVersioning` (`true` pour oui, `false` pour non).
L'agent NE DOIT PAS renseigner `autoVersioning` sans une réponse explicite de l'opérateur.
