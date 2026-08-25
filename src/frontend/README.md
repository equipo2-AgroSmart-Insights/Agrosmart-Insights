# Frontend NLQ (Microfrontend)

**Owner:** Frontend (Cindy Huanca)  
**Stack:** React 18 + Vite + Chart.js

## Arquitectura demo

```
components/chat/     → ChatInput, LoadingIndicator
components/dashboard/ → DashboardContainer, PriceChart, ErrorState
hooks/             → useNLQQuery
context/           → QueryContext (estado compartido)
services/          → n8nClient.js (único que conoce VITE_WEBHOOK_URL)
```

Contrato JSON esperado del webhook WF2:

```json
{
  "respuesta": "texto",
  "grafico": { "labels": [], "values": [] }
}
```

## Desarrollo local

```bash
copy .env.example .env
npm install
npm run dev
```

## Despliegue (Vercel)

Root directory: `src/frontend`  
Variable obligatoria: `VITE_WEBHOOK_URL`

Ver `docs/DEPLOY.md`.
