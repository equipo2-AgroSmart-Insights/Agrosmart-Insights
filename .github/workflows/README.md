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
- **CodeQL** (`codeql-analysis.yml`): analiza el **código propio** (Python de `src/ia-ops` y JS/TS del frontend) en cada push/PR a `main` y semanalmente. No es un bot ni abre PRs — solo reporta hallazgos en GitHub Security → Code scanning alerts. **Sí es required check** (`Analizar (python)`, `Analizar (javascript-typescript)`): un PR no se puede mergear si CodeQL encuentra una vulnerabilidad.
- **Gitleaks** (`secret-scan.yml`): escanea **todo el repositorio** (no solo `src/n8n-workflows/`) en busca de credenciales/tokens expuestos, en cada PR, push a `main` y semanalmente. Complementa al chequeo puntual de `n8n-validate-ci.yml`.

## Automatización operativa (CT / infraestructura)

| Workflow | Frecuencia | Qué hace |
|---|---|---|
| `scheduled-health-check.yml` | Cada 6 horas | Verifica que producción (n8n + frontend) responda, usando `infrastructure/scripts/health-check.sh`. Solo mira HTTP 200 — no navega ni ejecuta nada. |
| `respaldo-proyecto.yml` | Semanal (lunes) + en PRs que tocan `infrastructure/backup/` | Respaldo del proyecto (tablas de la app, workflows de n8n, código y manual) en un `.7z` cifrado con `BACKUP_PASSPHRASE`, y **restauración de prueba** en una base vacía comparando filas. En PRs corre el mismo circuito con datos sintéticos. Reemplaza a `backup-postgres.yml` (dump completo sin cifrar). Manual: `docs/w1-backup-restore/MANUAL-RESTAURACION.md`. |
| `e2e-playwright.yml` | Cada 6 horas | Prueba el flujo real de un usuario en un navegador de verdad (Playwright): carga la página, manda una consulta al chat, espera la respuesta real del LLM, y revisa que el microfrontend de Monitoreo cargue. Es la capa que el healthcheck no cubre. No bloquea merges (depende de LLMs reales y de que producción esté "despierta"). |
| `n8n-drift-check.yml` | Diario | Compara los workflows reales en producción (consulta directa a `workflow_entity` en Postgres) contra las copias versionadas en `src/n8n-workflows/production/`. Nació de 3 incidentes reales en Sprint 3 donde un workflow se editó directo en el editor de n8n y la copia en git quedó obsoleta (en un caso, un workflow activo no tenía ninguna copia en git). |
| `ai-evals.yml` | 2 veces al día | **(LLMOps)** Le hace al chat real las mismas preguntas de precio que tiene `src/ia-ops/tests/dataset_ground_truth.json`, refrescado contra la base de datos real con `RENDER_DATABASE_URL`, y mide: tasa de éxito HTTP, tasa de "rechazo indebido" (preguntas de precio legítimas bloqueadas como fuera de alcance — ver `docs/sprint-4/S4-LLMOps-Inventario-Modelos-y-Evals.md`), y latencia p95. La "exactitud numérica" exacta queda como métrica informativa, no como gate — el precio de mercado cambia a diario, compararlo contra un dataset de hace semanas da falsos positivos que no son culpa de la IA. Si están configurados `LANGFUSE_PUBLIC_KEY`/`SECRET_KEY`, también reporta costo/tokens acumulados. |

Estos también se pueden disparar manualmente desde la pestaña Actions (`workflow_dispatch`).

### Bajo demanda (no programados)

| Workflow | Qué hace |
|---|---|
| `n8n-export.yml` | Exporta un workflow de producción a JSON (con secretos redactados) y abre un PR con el resultado — para resolver el drift que detecta `n8n-drift-check.yml` sin que el secret de base de datos tenga que pasar por la laptop de nadie. Deliberadamente manual: un drift puede significar que lo desalineado es producción, no git, y decidir cuál lado es el correcto sigue siendo una decisión humana. |

### Alertas automáticas (sin Slack/Teams — vía Issues de GitHub)

`e2e-playwright.yml`, `scheduled-health-check.yml`, `n8n-drift-check.yml`, `ai-evals.yml` y `respaldo-proyecto.yml` abren (o comentan, si ya hay uno abierto) un Issue con la etiqueta correspondiente (`ci-e2e-failure`, `ci-health-check-failure`, `n8n-drift`, `ai-eval-failure`, `backup-failure`) cuando fallan en su corrida programada — antes, una falla de madrugada solo se notaba si alguien entraba a mano a la pestaña Actions. No se integró con Teams/Slack por no depender de un webhook externo adicional; usan el `GITHUB_TOKEN` que ya existe en cada corrida.
