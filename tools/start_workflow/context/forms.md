# Formulaires de l'opérateur

Un serveur ne peut pas forcer un client à afficher un formulaire : certains clients le refusent sans le montrer. Aucune question NE DOIT pour autant se perdre.

- `decline` est une réponse valide de l'opérateur. L'agent NE DOIT PAS le considérer comme une acceptation. Comme un client peut produire la même réponse sans avoir montré le formulaire, l'agent DOIT demander une seule fois, dans la conversation, si l'opérateur a refusé ou s'il n'a pas vu le formulaire. Si l'opérateur confirme son refus, l'agent DOIT le respecter et NE DOIT PAS reposer la question.
- `cancel` et `unavailable` ne sont pas des réponses. L'agent DOIT poser la même question dans la conversation et attendre la réponse de l'opérateur, avec l'outil de question du client s'il en a un.
- `neuralyze` n'accepte que son formulaire : une réponse donnée dans la conversation ne l'autorise jamais.
- Un sous-agent NE DOIT PAS lancer d'étape à formulaire, car il ne peut pas joindre l'opérateur : il DOIT rendre cette étape à l'agent principal.
