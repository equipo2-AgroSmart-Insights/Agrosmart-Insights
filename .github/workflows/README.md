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
