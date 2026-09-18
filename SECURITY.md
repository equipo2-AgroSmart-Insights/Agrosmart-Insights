# Política de Seguridad

## Reporte de vulnerabilidades

Si encuentras una vulnerabilidad de seguridad en este repositorio (credenciales expuestas, inyección, acceso no autorizado, etc.), repórtala directamente al Líder DevSecOps del proyecto:

- **Gabriel León Cangalaya** — Líder DevSecOps, Célula 2
- Vía issue privado o mensaje directo al equipo — **no abras un issue público** describiendo el detalle de la vulnerabilidad hasta que se haya corregido.

## Alcance

Este proyecto es un trabajo académico (curso Taller de Proyectos, USMP). No maneja datos de producción de terceros ni información personal sensible de usuarios reales — los datos de precios y clima provienen de fuentes públicas (MIDAGRI, Open-Meteo).

## Controles de seguridad automatizados vigentes

| Control | Herramienta |
|---|---|
| Análisis estático de código (SAST) | CodeQL (`.github/workflows/codeql-analysis.yml`), Python y JavaScript/TypeScript |
| Escaneo de dependencias vulnerables | Dependabot (`.github/dependabot.yml`), npm/pip/GitHub Actions |
| Bloqueo de credenciales hardcodeadas en workflows de n8n | `.github/workflows/n8n-validate-ci.yml` |
| Branch protection en `main` | 1 aprobación obligatoria + 3 checks obligatorios, sin autoaprobación |

## Manejo de secretos

- Las credenciales reales (API keys de Groq, Gemini, HuggingFace, MapTiler, contraseñas de base de datos) se gestionan exclusivamente vía **GitHub Secrets** (CI/CD) o **Credentials de n8n** (runtime) — nunca en archivos versionados en git.
- Los archivos `.env` están excluidos del control de versiones (`.gitignore`).
- Los JSON exportados de n8n se auditan automáticamente antes de aceptar un Pull Request para detectar claves pegadas en texto plano.
