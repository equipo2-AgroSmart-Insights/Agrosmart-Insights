# Frontend NLQ (Microfrontend)

**Owner:** Frontend  
**Sprint 0:** esqueleto de carpeta. El chat NLQ se construye desde Sprint 2.

## Responsabilidad
Interfaz ligera de Natural Language Query. El usuario escribe en lenguaje natural; el frontend **solo** habla con webhooks de n8n (nunca directo a PostgreSQL ni a APIs de IA).

## Estructura esperada
```
src/frontend/
├── public/
├── src/
├── package.json
└── README.md
```

## Despliegue
Estático (GitHub Pages / Vercel). El pipeline `frontend-ci.yml` valida lint/build en cada PR (es required check de `main`).

## Checklist DevSecOps
- No hardcodear API keys.
- Consumir solo `WEBHOOK_URL` / variables de entorno documentadas en `infrastructure/.env.example`.
