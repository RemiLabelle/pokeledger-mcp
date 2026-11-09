Les règles ne sont pas renvoyées : l'opérateur n'a pas indiqué le numéro de l'issue Jira de cette session (le formulaire a été refusé, annulé, n'a pas reçu de réponse valide ou n'a pas pu être affiché).
L'agent DOIT demander à l'opérateur, dans la conversation, le numéro de l'issue Jira (projet P2A26E2) liée à ce travail, ou s'il n'y en a pas. Si la branche active contient une clé `P2A26E2-<n>`, l'agent PEUT proposer ce numéro, mais NE DOIT PAS le retenir sans la confirmation de l'opérateur.
L'agent DOIT ensuite rappeler `start_workflow` avec le paramètre `issueNumber` (le numéro, ou `"none"` s'il n'y a pas d'issue).
L'agent NE DOIT PAS renseigner `issueNumber` sans une réponse explicite de l'opérateur, et NE DOIT effectuer aucune opération Git avant.
