import { useState } from 'react';
import { useQueryContext } from '../../context/QueryContext.jsx';

export default function ChatInput() {
  const [query, setQuery] = useState('');
  const { submitQuery, appendHistory, status } = useQueryContext();

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === 'loading') return;

    try {
      const data = await submitQuery(query);
      appendHistory({ query, data, at: new Date().toISOString() });
      setQuery('');
    } catch {
      /* error ya manejado en contexto */
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <label htmlFor="nlq-query">Escribe tu consulta</label>
      <textarea
        id="nlq-query"
        rows={3}
        placeholder="Ej: ¿Cuál fue el precio del tomate en GMML ayer?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={status === 'loading'}
      />
      <button type="submit" disabled={status === 'loading' || !query.trim()}>
        Consultar
      </button>
    </form>
  );
}
