import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ChatApp from './ChatApp.jsx'

// Entry point para desarrollo standalone del microfrontend
// En producción este archivo no se usa; el shell carga ChatApp vía Module Federation
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChatApp />
  </StrictMode>,
)
