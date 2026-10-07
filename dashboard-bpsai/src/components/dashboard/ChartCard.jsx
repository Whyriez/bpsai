import "../../lib/chartTheme";

export const ChartSkeleton = () => (
  <div className="chart-panel animate-pulse" aria-label="Memuat grafik">
    <div className="h-4 bg-hover rounded w-1/2 mb-6" />
    <div className="h-[245px] bg-subtle rounded" />
  </div>
);

export default function ChartCard({ title, children, isRound = false }) {
  return (
    <section className="chart-panel">
      <h3>{title}</h3>
      <div
        className={`chart-panel-plot ${isRound ? "is-round" : ""}`}
        role="img"
        aria-label={title}
      >
        {children}
      </div>
    </section>
  );
}
