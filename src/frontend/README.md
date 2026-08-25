# Frontend NLQ (Microfrontend)

**Owner:** Cindy Huanca Mamani (Frontend)  
**App:** `agrosmart-frontend/` (React 19 + Vite 8 + Chart.js)

## Estructura

```
src/frontend/
└── agrosmart-frontend/
    ├── src/components/chat/       ChatInput, LoadingIndicator
    ├── src/components/dashboard/  DashboardContainer, PriceChart, ErrorState
    ├── src/context/               QueryContext
    ├── src/hooks/                 useNLQQuery
    ├── src/services/              n8nClient.js
    ├── .env.example               VITE_N8N_WEBHOOK_URL
    └── vercel.json
```

## Contrato con WF2 (n8n)

- **POST** `{ pregunta, session_id }`
- **Respuesta:** `{ respuesta, grafico? }`

## Desarrollo local

```bash
cd src/frontend/agrosmart-frontend
copy .env.example .env
npm install
npm run dev
```

## Despliegue

Vercel root directory: `src/frontend/agrosmart-frontend`  
Variable: `VITE_N8N_WEBHOOK_URL`

Ver `docs/DEPLOY.md`.
