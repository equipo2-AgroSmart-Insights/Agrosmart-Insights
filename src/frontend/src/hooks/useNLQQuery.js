import { useCallback, useState } from 'react';
import { postNLQQuery } from '../services/n8nClient.js';

export function useNLQQuery() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submitQuery = useCallback(async (query) => {
    const trimmed = query?.trim();
    if (!trimmed) return;

    setStatus('loading');
    setError(null);

    try {
      const data = await postNLQQuery(trimmed);
      setResult(data);
      setStatus('success');
      return data;
    } catch (err) {
      setError(err.message || 'Error al consultar el webhook');
      setStatus('error');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, submitQuery, reset };
}
