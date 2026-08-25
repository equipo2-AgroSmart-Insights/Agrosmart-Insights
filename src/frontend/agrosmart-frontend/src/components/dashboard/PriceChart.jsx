import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale } from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

export default function PriceChart({ data }) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Precio (S/)",
        data: data.values,
        borderColor: "#3d5a80",
      },
    ],
  };

  return <Line data={chartData} />;
}