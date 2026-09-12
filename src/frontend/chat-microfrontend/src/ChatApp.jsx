import './index.css'
import { QueryProvider } from './context/QueryContext'
import NLQHome from './components/chat/NLQHome'

/**
 * ChatApp — Componente raíz expuesto vía Module Federation.
 *
 * El shell lo importa como:
 *   const ChatApp = React.lazy(() => import('chat/ChatApp'))
 *
 * En modo standalone (npm run dev en este proyecto) se monta
 * directamente desde main.jsx con un fondo de página completo.
 */
export default function ChatApp() {
  return (
    <QueryProvider>
      <NLQHome />
    </QueryProvider>
  )
}
