La variable d'environnement `ELEVENLABS_API_KEY` n'est pas définie pour le
serveur. L'agent DOIT le signaler à l'opérateur : la clé se transmet au
conteneur avec `docker run -e ELEVENLABS_API_KEY …`. L'agent NE DOIT PAS
demander la valeur de la clé dans la conversation.
