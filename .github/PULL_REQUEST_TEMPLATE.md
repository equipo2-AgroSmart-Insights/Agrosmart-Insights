## 🔗 Vinculación con Gestión (GitHub Projects)
- **Issue vinculado:** Closes #

## 📝 Descripción del Cambio
Setup de infraestructura base, Docker Compose y pruebas unitarias de seguridad para prompts (Caso 2).

## 📐 Tipo de Cambio
- [ ] Backend / n8n Workflow (`src/n8n-workflows/`)
- [ ] Frontend NLQ (`src/frontend/`)
- [ ] Base de Datos SQL (`src/database/`)
- [x] IA Ops / Prompts (`src/ia-ops/`)
- [x] Pipeline CI/CD / Infraestructura (`infrastructure/` o `.github/`)

## 🛡️ Checklist DevSecOps
- [x] **Cero Credenciales Expuestas:** No se incluyeron API keys en texto plano.
- [x] **Variables de Entorno:** Se utiliza `.env.example`.
- [x] **Pruebas de IA:** Pruebas de inyección configuradas en PyTest.

## ✍️ Aprobaciones Requeridas
- **Líder DevSecOps:** [ ] Aprobado
- **Arquitecto de Software:** [ ] Aprobado
