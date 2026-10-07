export const KpiCardSkeleton = () => (
  <div className="metric-card animate-pulse" aria-label="Memuat ringkasan">
    <div className="h-3 bg-hover rounded w-2/3 mb-5" />
    <div className="h-8 bg-hover rounded w-1/2 mb-3" />
    <div className="h-2 bg-hover rounded w-3/4" />
  </div>
);

export default function KpiCard({ title, value, subtitle, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-card-heading">
        <p>{title}</p>
        <span>{icon}</span>
      </div>
      <p className="metric-card-value">{value ?? "—"}</p>
      {subtitle && <p className="metric-card-note">{subtitle}</p>}
    </div>
  );
}
