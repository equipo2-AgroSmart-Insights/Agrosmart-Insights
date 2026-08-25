import PriceChart from './PriceChart.jsx';

export default function DashboardContainer({ result, status }) {
  if (status === 'idle') {
    return (
      <div className="dashboard dashboard--empty">
        <p>Los gráficos aparecerán aquí cuando envíes una consulta.</p>
      </div>
    );
  }

  const respuesta = result?.respuesta || result?.response || '';
  const grafico = result?.grafico || result?.trend_data || null;

  return (
    <div className="dashboard">
      {respuesta && (
        <article className="dashboard__answer">
          <h2>Respuesta</h2>
          <p>{respuesta}</p>
        </article>
      )}
      <PriceChart grafico={grafico} />
    </div>
  );
}
