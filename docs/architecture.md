# Architecture

## Structure

```text
src/index.js                  point d'entrée stdio
src/server.js                 création du serveur, enregistrement des outils publics
tools/<outil>/                un dossier par outil ou étape interne
  index.js                    déclaration de l'outil ou de l'étape
  *.test.js ou test/          tests de l'outil
tools/start_workflow/
  index.js                    outil public et routage des étapes (`step`)
  context.js                  chargement des fichiers de contexte
  context/                    règles et textes destinés au modèle
  test/fixtures/              dossiers de contexte de test
tools/validate_tests/,
tools/choose_implementation/,
tools/confirm_custom_implementation/
  texts.js                    chargement et rendu des gabarits
  context/                    messages à l'opérateur et à l'agent
```
