# Convention Git

Documentation et issues en français. Code, branches et commits en anglais.

## Branches principales

- `main` : code stable et versions publiées du Frontend. Commits et push directs
  interdits.
- `develop` : intégration des fonctionnalités avant publication. Commits et
  push directs interdits ; c'est la branche de base et de destination des
  branches de travail.

## Branches de travail

Format :

```text
<type>/<description>
<type>/P2A26E2-<n>-<description>
```

La description est courte, explicite, en anglais et en `kebab-case`. Si une
issue Jira existe, sa clé `P2A26E2-<n>` (où `<n>` est le numéro de l'issue)
précède la description : `fix/P2A26E2-13-handle-timeout`.

| Type        | Usage                        | Part de   | Fusionne dans           |
| ----------- | ---------------------------- | --------- | ----------------------- |
| `feature/*` | Nouvelle fonctionnalité      | `develop` | `develop`               |
| `fix/*`     | Correction normale           | `develop` | `develop`               |
| `hotfix/*`  | Correction urgente de `main` | `main`    | `main` (puis `develop`) |
| `chore/*`   | Maintenance technique        | `develop` | `develop`               |
| `docs/*`    | Documentation                | `develop` | `develop`               |

Créer une branche :

```bash
git switch develop
git pull origin develop
git switch -c <type>/<description>
git push -u origin <type>/<description>
```

## Commits

Format :

```text
<type>(<scope-optionnel>): <description>
```

La description est courte, impérative, en anglais. Si une issue Jira existe,
sa clé `P2A26E2-<n>` est placée au début de la description :
`fix(api): P2A26E2-13 handle timeout`.

Types autorisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Pour un changement cassant, utiliser `feat!` :

```text
feat!(api): P2A26E2-42 change response format
```

## Hotfixes

Un hotfix suit le flux :

```text
main -> hotfix/* -> main -> develop -> tag v<nouvelle-version-patch>
```

Le tag est créé sur le commit corrigé de `main` après la fusion du hotfix. Le
hotfix doit aussi être fusionné dans `develop` pour que la correction ne soit
pas perdue à la prochaine publication. Une correction de `v1.0.0` devient
donc `v1.0.1`.