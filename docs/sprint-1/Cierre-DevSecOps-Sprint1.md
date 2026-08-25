# Cierre DevSecOps — Sprint 1

**Integrante:** Gabriel Emilio León Cangalaya — Líder DevSecOps, Célula 2  
**Proyecto:** AgroSmart Insights  
**Historias:** S1-01 (8 SP) + S1-06 (5 SP)  
**Referencias:** `docs/sprint-1/backlog/Sprint_1_Backlog.xlsx`, `Informe_Sprint_Planning_Sprint_1.docx`

---

## Integración Frontend + Backend (confirmación)

| Capa | Origen | Estado en repo |
|---|---|---|
| **Frontend** | Rama `HuancaMamani` (Cindy Huanca) | ✅ Integrado en `src/frontend/agrosmart-frontend/` |
| Contrato webhook WF2 | `{ pregunta, session_id }` → `{ respuesta, grafico? }` | ✅ Alineado |
| **Backend n8n** | WF0/WF1/WF2 (Fiorella / equipo) | ✅ Versionados en `src/n8n-workflows/production/` |
| **Base de datos** | Esquema v2 + seed GMML | ✅ `src/database/migrations/` + `seeders/` |
| **Infra** | Docker + Phoenix + Render blueprint | ✅ `infrastructure/` + `render.yaml` |

> La rama/ZIP de Camayoc no aportaba JSONs adicionales; los flujos vigentes son los ya integrados en `production/`. Frontend y backend **quedaron integrados de forma coherente** en `LeonCangalaya`.

---

## S1-01 — Cloud + CI/CD

| Criterio | Evidencia | Estado |
|---|---|---|
| Pipeline CI/CD GitHub Actions | `.github/workflows/deploy.yml` | ✅ |
| Build + lint frontend en deploy | Job `validate-before-deploy` | ✅ |
| Blueprint cloud Render | `render.yaml` | ✅ |
| Guía Vercel + Render | `docs/DEPLOY.md` | ✅ |
| Health check HTTP | `infrastructure/scripts/health-check.sh` + secret `N8N_HEALTH_URL` | ✅ |
| Script rollback | `infrastructure/scripts/rollback.sh` | ✅ |
| Deploy SSH opcional | Job `deploy-via-ssh` (manual, secrets `SSH_KEY`, `SERVER_HOST`) | ✅ |
| Servidor cloud **en vivo** | Vercel + Render conectados por el equipo | ⏳ Manual en dashboard |

---

## S1-06 — Bloqueo PR + calidad

| Criterio | Evidencia | Estado |
|---|---|---|
| Branch Protection `main` | PR + 1 approval + 3 checks | ✅ (Sprint 0) |
| ESLint frontend | `frontend-ci.yml` → `npm run lint` | ✅ |
| Flake8 Python | `ai-testing-ci.yml` | ✅ |
| Black --check | `ai-testing-ci.yml` | ✅ |
| PyTest IA Ops | `ai-testing-ci.yml` | ✅ |
| Auditoría JSON n8n | `n8n-validate-ci.yml` | ✅ |

---

## Artefactos de planning (celula)

| Archivo | Ubicación |
|---|---|
| Backlog Sprint 1 | `docs/sprint-1/backlog/Sprint_1_Backlog.xlsx` |
| Informe Sprint Planning | `docs/sprint-1/backlog/Informe_Sprint_Planning_Sprint_1.docx` |
| PoCs DevSecOps | `docs/sprint-1/informes/devsecops/` |

---

## Único paso manual restante (cloud vivo)

1. **Vercel:** importar repo, root `src/frontend/agrosmart-frontend`, `VITE_N8N_WEBHOOK_URL`.
2. **Render:** aplicar `render.yaml`, migraciones SQL, importar WF0–WF2.
3. **GitHub Secrets (opcional health):** `N8N_HEALTH_URL`, `FRONTEND_HEALTH_URL`.

Con eso el Sprint 1 DevSecOps queda **cerrado en repo + CI**; el cloud en vivo es activación en dashboard (5–10 min).
