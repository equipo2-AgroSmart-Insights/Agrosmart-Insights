# GitHub Actions (Canal DevSecOps)

## CI — Required checks en PRs (`main`)

| Workflow | Job (status check) | Qué valida |
|---|---|---|
| `n8n-validate-ci.yml` | Auditar JSONs de n8n | Sintaxis JSON + credenciales expuestas |
| `frontend-ci.yml` | validate-frontend | ESLint + build del microfrontend |
| `ai-testing-ci.yml` | Pruebas Unitarias de IA | Flake8 + Black + PyTest |

Estos nombres están enlazados en **Branch Protection** de `main`. Si fallan, el merge queda bloqueado (**S1-06**).

## CD — Deploy cloud en push a `main` (**S1-01**)

| Workflow | Jobs | Destino |
|---|---|---|
| `deploy.yml` | validate-before-deploy | Lint, build, JSON n8n, render.yaml |
| | deploy-vercel | Producción Vercel (secrets VERCEL_*) |
| | deploy-render | Deploy Hook Render (secret RENDER_DEPLOY_HOOK_N8N) |
| | deploy-via-ssh | Manual — Docker Compose en VPS (SSH_KEY, SERVER_HOST) |

Guías: `docs/sprint-1/SETUP-VERCEL-RENDER.md` y `docs/sprint-1/SECRETS-GITHUB-SPRINT1.md`

> ⚠️ `deploy-vercel` y `deploy-render` son disparadores opcionales: si faltan sus secrets, terminan en no-op (exit 0) y quedan en verde sin desplegar nada. El deploy real de producción va por la integración nativa de Vercel/Render con el repo.

## Seguridad — SAST / Dependencias

- **Dependabot** (`.github/dependabot.yml`): actualizaciones semanales de npm (frontend), pip (`src/ia-ops/tests`) y GitHub Actions. Vigila **dependencias de terceros**.
- **Vulnerability alerts** habilitadas a nivel de repositorio (GitHub Security → Dependabot alerts).
- **CodeQL** (`codeql-analysis.yml`): analiza el **código propio** (Python de `src/ia-ops` y JS/TS del frontend) en cada push/PR a `main` y semanalmente. No es un bot ni abre PRs — solo reporta hallazgos en GitHub Security → Code scanning alerts. No está configurado como required check (no bloquea merges), para no generar falsos bloqueos mientras se afinan las reglas.
