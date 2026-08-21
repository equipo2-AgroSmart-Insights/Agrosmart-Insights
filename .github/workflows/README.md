# GitHub Actions (Canal DevSecOps)

| Workflow | Job (status check) | Qué valida |
|---|---|---|
| `n8n-validate-ci.yml` | Auditar JSONs de n8n | Sintaxis JSON + credenciales expuestas |
| `frontend-ci.yml` | validate-frontend | Estructura / lint / build del microfrontend |
| `ai-testing-ci.yml` | Pruebas Unitarias de IA | PyTest de prompt injection |

Estos nombres están enlazados en Branch Protection de `main`. Si el check falla, el merge queda bloqueado.
