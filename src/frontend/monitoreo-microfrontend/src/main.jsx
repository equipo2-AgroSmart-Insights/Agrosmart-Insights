import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MonitoreoSatelital from './components/monitoreo/MonitoreoSatelital'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main className="min-h-screen p-4 bg-background">
      <MonitoreoSatelital />
    </main>
  </StrictMode>,
)
