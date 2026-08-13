# IA Ops

Capa de seguridad y observabilidad de IA para AgroSmart Insights.

| Ruta | Uso |
|---|---|
| `prompts/` | System prompts versionados (QA) |
| `tests/` | PyTest de prompt injection / alucinaciones |
| `config-observability/` | Parámetros Langfuse / Phoenix |
| `nlq_security.py` | Filtro local de seguridad NLQ (Sprint 0 base) |

Pipeline: `.github/workflows/ai-testing-ci.yml` → job `Pruebas Unitarias de IA`.
