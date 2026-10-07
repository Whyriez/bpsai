import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);
ChartJS.defaults.font.family = "Inter, Segoe UI, sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.animation = false;
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.plugins.legend.labels.boxHeight = 10;
ChartJS.defaults.plugins.legend.labels.padding = 18;
ChartJS.defaults.plugins.legend.position = "bottom";
ChartJS.defaults.elements.line.borderWidth = 2;
ChartJS.defaults.elements.point.radius = 3;
ChartJS.defaults.scale.grid.drawTicks = false;

ChartJS.register({
  id: "sigapTheme",
  beforeUpdate(chart) {
    const styles = getComputedStyle(document.documentElement);
    const muted = styles.getPropertyValue("--muted").trim();
    const line = styles.getPropertyValue("--line").trim();
    const accent = styles.getPropertyValue("--accent").trim();
    const surface = styles.getPropertyValue("--surface").trim();
    chart.options.color = muted;
    if (chart.options.plugins?.legend?.labels)
      chart.options.plugins.legend.labels.color = muted;
    Object.values(chart.options.scales || {}).forEach((scale) => {
      if (scale.ticks) scale.ticks.color = muted;
      if (scale.grid) scale.grid.color = line;
      if (scale.border) scale.border.color = line;
    });
    if (chart.config.type === "line")
      chart.data.datasets.forEach((dataset) => {
        dataset.borderColor = accent;
        dataset.pointBackgroundColor = accent;
        dataset.pointBorderColor = surface;
      });
    if (chart.config.type === "doughnut")
      chart.data.datasets.forEach((dataset) => {
        dataset.borderColor = surface;
      });
  },
});

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      border: { display: false },
    },
  },
};
export const chartPalette = [
  "#39769e",
  "#7291aa",
  "#98adbd",
  "#5f8e83",
  "#b49a68",
];
export function syncChartTheme() {
  Object.values(ChartJS.instances).forEach((chart) => chart.update("none"));
}
