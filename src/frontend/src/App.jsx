import ChatInput from './components/chat/ChatInput.jsx';
import LoadingIndicator from './components/chat/LoadingIndicator.jsx';
import DashboardContainer from './components/dashboard/DashboardContainer.jsx';
import ErrorState from './components/dashboard/ErrorState.jsx';
import { useQueryContext } from './context/QueryContext.jsx';

export default function App() {
  const { status, result, error } = useQueryContext();

  return (
    <div className="app">
      <header className="app__header">
        <h1>AgroSmart Insights</h1>
        <p>Consulta precios agrícolas en lenguaje natural</p>
      </header>

      <main className="app__main">
        <section className="app__chat">
          <ChatInput />
          {status === 'loading' && <LoadingIndicator />}
          {status === 'error' && error && <ErrorState message={error} />}
        </section>

        <section className="app__dashboard">
          <DashboardContainer result={result} status={status} />
        </section>
      </main>
    </div>
  );
}
