import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MercadosMIDAGRI from './components/mercados/MercadosMIDAGRI'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main className="min-h-screen p-6 bg-background">
      <MercadosMIDAGRI />
    </main>
  </StrictMode>,
)
