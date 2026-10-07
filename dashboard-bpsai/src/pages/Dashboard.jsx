import { useEffect, useState } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ClockIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import KpiCard, { KpiCardSkeleton } from "../components/dashboard/KpiCard";
import ChartCard, { ChartSkeleton } from "../components/dashboard/ChartCard";
import { chartOptions, chartPalette } from "../lib/chartTheme";
import apiFetch from "../services/api";

const timeAgo = (timestamp) => {
  const elapsed = Math.max(0, Date.now() - new Date(timestamp).getTime());
  if (!Number.isFinite(elapsed)) return "Waktu tidak tersedia";
  for (const [unit, duration] of [
    ["tahun", 31536000000],
    ["bulan", 2592000000],
    ["hari", 86400000],
    ["jam", 3600000],
    ["menit", 60000],
  ]) {
    if (elapsed >= duration)
      return `${Math.floor(elapsed / duration)} ${unit} lalu`;
  }
  return "Baru saja";
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch("/dashboard/kpis"),
      apiFetch("/dashboard/charts/questions-frequency"),
      apiFetch("/dashboard/charts/intent-distribution"),
      apiFetch("/dashboard/recent-activity"),
      apiFetch("/dashboard/charts/question-types"),
    ])
      .then(([kpis, frequency, intent, activity, types]) => {
        if (active) setData({ kpis, frequency, intent, activity, types });
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const frequency = data && {
    labels: data.frequency.labels,
    datasets: [
      {
        ...data.frequency.datasets[0],
        label: data.frequency.datasets[0].label || "Pertanyaan",
        borderColor: "#285e85",
        backgroundColor: "rgba(57,118,158,.07)",
        tension: 0.3,
        fill: true,
      },
    ],
  };
  const intent = data && {
    labels: data.intent.labels,
    datasets: [
      {
        ...data.intent.datasets[0],
        backgroundColor: chartPalette,
        borderRadius: 3,
        maxBarThickness: 42,
      },
    ],
  };
  const types = data && {
    labels: data.types.labels,
    datasets: [
      {
        ...data.types.datasets[0],
        backgroundColor: ["#39769e", "#b6c6d3"],
        borderWidth: 3,
        hoverOffset: 3,
      },
    ],
  };
  const metrics = data && [
    {
      title: "Total sesi",
      ...data.kpis.total_sessions,
      icon: <ChatBubbleLeftRightIcon />,
    },
    {
      title: "Pengguna aktif · 24 jam",
      ...data.kpis.active_users,
      icon: <UsersIcon />,
    },
    {
      title: "Rata-rata percakapan",
      ...data.kpis.avg_conversation,
      icon: <ClockIcon />,
    },
    {
      title: "Rasio umpan balik",
      ...data.kpis.feedback_ratio,
      icon: <ChatBubbleBottomCenterTextIcon />,
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow">Pemantauan layanan</p>
          <h1>Ringkasan layanan SIGAP</h1>
          <p>
            Pantau penggunaan, percakapan, dan kinerja asisten statistik BPS
            Gorontalo.
          </p>
        </div>
        <div className="page-intro-actions">
          <Link to="/analytics" className="ui-button ui-button-outline">
            Lihat analisis
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
      {error ? (
        <div className="status-panel is-error" role="alert">
          Ringkasan belum dapat dimuat. {error}
        </div>
      ) : (
        <>
          <div className="dashboard-kpis">
            {metrics
              ? metrics.map((metric) => (
                  <KpiCard key={metric.title} {...metric} />
                ))
              : [0, 1, 2, 3].map((key) => <KpiCardSkeleton key={key} />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {data ? (
              <>
                <ChartCard title="Frekuensi pertanyaan">
                  <Line
                    data={frequency}
                    options={{
                      ...chartOptions,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </ChartCard>
                <ChartCard title="Distribusi maksud pertanyaan">
                  <Bar
                    data={intent}
                    options={{
                      ...chartOptions,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </ChartCard>
              </>
            ) : (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {data ? (
              <ChartCard title="Jenis pertanyaan" isRound>
                <Doughnut
                  data={types}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "72%",
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </ChartCard>
            ) : (
              <ChartSkeleton />
            )}
            <section className="dashboard-activity xl:col-span-2">
              <h3>Aktivitas terbaru</h3>
              {!data ? (
                [0, 1, 2, 3].map((key) => (
                  <div key={key} className="activity-row animate-pulse">
                    <div className="h-3 w-2/3 bg-hover rounded" />
                    <div className="h-3 w-16 bg-hover rounded" />
                  </div>
                ))
              ) : data.activity.length ? (
                data.activity.map((activity, index) => (
                  <div key={activity.id || index} className="activity-row">
                    <p title={activity.prompt}>{activity.prompt}</p>
                    <span>{timeAgo(activity.timestamp)}</span>
                  </div>
                ))
              ) : (
                <p className="activity-empty">
                  Belum ada aktivitas percakapan.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
