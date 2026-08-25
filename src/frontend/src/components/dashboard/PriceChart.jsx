import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PriceChart({ grafico }) {
  if (!grafico?.labels?.length) {
    return (
      <div className="chart chart--empty">
        <p>Sin datos de gráfico en la respuesta del webhook.</p>
      </div>
    );
  }

  const data = {
    labels: grafico.labels,
    datasets: [
      {
        label: grafico.label || 'Precio (S/)',
        data: grafico.values || grafico.data || [],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Tendencia de precios' },
    },
  };

  return (
    <div className="chart">
      <Line data={data} options={options} />
    </div>
  );
}
