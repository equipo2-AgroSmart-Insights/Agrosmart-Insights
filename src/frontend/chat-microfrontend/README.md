# chat-microfrontend

Microfrontend independiente del **Chat / NLQ** de AgroSmart Insights.

Se integra al shell principal (`agrosmart-frontend`) mediante **Vite Module Federation**.

## Desarrollo

### Modo standalone (solo el chat, sin el shell)
```bash
cd src/frontend/chat-microfrontend
npm run dev
# → http://localhost:5174
```

### Modo integrado con el shell
```bash
# Terminal 1 — construir y servir el chat remote
cd src/frontend/chat-microfrontend
npm run build
npm run preview   # → sirve remoteEntry.js en :5174

# Terminal 2 — shell (consume el remote del chat)
cd src/frontend/agrosmart-frontend
npm run dev       # → http://localhost:5173
```

O desde el directorio raíz `src/frontend/`:
```bash
npm run dev:chat     # solo el chat (standalone)
npm run dev:shell    # solo el shell (con chat integrado vía federation)
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena:

```
VITE_N8N_WEBHOOK_URL=https://...
VITE_API_TIMEOUT_MS=30000
```

## Archivos expuestos vía Module Federation

| Expose | Archivo |
|---|---|
| `chat/ChatApp` | `src/ChatApp.jsx` |

## Estructura

```
src/
├── ChatApp.jsx              ← componente raíz expuesto
├── index.css                ← design system (tokens Tailwind)
├── main.jsx                 ← entry standalone
├── components/
│   ├── chat/
│   │   ├── NLQHome.jsx
│   │   ├── ChatInput.jsx
│   │   ├── LoadingIndicator.jsx
│   │   └── SuggestedQueries.jsx
│   └── dashboard/
│       ├── DashboardContainer.jsx
│       ├── ErrorState.jsx
│       └── PriceChart.jsx
├── context/
│   └── QueryContext.jsx
├── hooks/
│   └── useNLQQuery.js
└── services/
    └── n8nClient.js
```
