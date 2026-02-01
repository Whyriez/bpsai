import React, { useEffect, useState } from "react";
import KpiCard, { KpiCardSkeleton } from "../components/dashboard/KpiCard";
import ChartCard, { ChartSkeleton } from "../components/dashboard/ChartCard";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import apiFetch from "../services/api";

const formatTimeAgo = (isoString) => {
  const date = new Date(isoString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " tahun lalu";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " bulan yang lalu";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " hari yang lalu";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " jam yang lalu";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " menit yang lalu";
  return Math.floor(seconds) + " sec ago";
};

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [questionsFreq, setQuestionsFreq] = useState(null);
  const [intentDist, setIntentDist] = useState(null);
  const [questionTypes, setQuestionTypes] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisData, freqData, intentData, activityData, typesData] =
          await Promise.all([
            apiFetch("/dashboard/kpis"),
            apiFetch("/dashboard/charts/questions-frequency"),
            apiFetch("/dashboard/charts/intent-distribution"),
            apiFetch("/dashboard/recent-activity"),
            apiFetch("/dashboard/charts/question-types"),
          ]);

        setKpis(kpisData);
        setRecentActivity(activityData);

        // Transform data for charts
        setQuestionsFreq({
          labels: freqData.labels,
          datasets: [
            {
              ...freqData.datasets[0],
              borderColor: "#3b82f6", // Biru cerah
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              pointBackgroundColor: "#3b82f6",
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: "#3b82f6",
              tension: 0.4,
              fill: true,
            },
          ],
        });

        setIntentDist({
          labels: intentData.labels,
          datasets: [
            {
              ...intentData.datasets[0],
              backgroundColor: [
                "#3b82f6",
                "#6366f1",
                "#a855f7",
                "#ec4899",
                "#f97316",
              ], // Palet baru
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        });

        setQuestionTypes({
          labels: typesData.labels,
          datasets: [
            {
              ...typesData.datasets[0],
              backgroundColor: ["#3b82f6", "#93c5fd"], // Biru primer & sekunder
              borderColor: "#ffffff",
              borderWidth: 4,
            },
          ],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="text-red-500 text-center p-8">
        Error loading dashboard: {error}
      </div>
    );
  }

  return (
    <div id="dashboard" className="section fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ringkasan Dashboard
        </h2>
        <p className="text-gray-600">
          Analisis real-time untuk kinerja Chatbot BPS Gorontalo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading || !kpis ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Sesi"
              value={kpis.total_sessions.value}
              subtitle={kpis.total_sessions.subtitle}
              icon={
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              }
              bgIcon="bg-blue-100"
            />

            <KpiCard
              title="Pengguna Aktif (24 jam)"
              value={kpis.active_users.value}
              subtitle={kpis.active_users.subtitle}
              icon={
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  ></path>
                </svg>
              }
              bgIcon="bg-green-100"
            />
            <KpiCard
              title="Percakapan Rata-rata"
              value={kpis.avg_conversation.value}
              subtitle={kpis.avg_conversation.subtitle}
              icon={
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              }
              bgIcon="bg-yellow-100"
            />
            <KpiCard
              title="Rasio Umpan Balik"
              value={kpis.feedback_ratio.value}
              subtitle={kpis.feedback_ratio.subtitle}
              icon={
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              }
              bgIcon="bg-purple-100"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading || !questionsFreq ? (
          <ChartSkeleton />
        ) : (
          <ChartCard title="Frekuensi Pertanyaan Pengguna">
            <Line data={questionsFreq} />
          </ChartCard>
        )}

        {loading || !intentDist ? (
          <ChartSkeleton />
        ) : (
          <ChartCard title="Distribusi Niat Pengguna">
            <Bar
              data={intentDist}
              options={{ plugins: { legend: { display: false } } }}
            />
          </ChartCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading || !questionTypes ? (
          <ChartSkeleton />
        ) : (
          <ChartCard title="Jenis Pertanyaan">
            <Doughnut data={questionTypes} />
          </ChartCard>
        )}

        <div className="lg:col-span-2 chart-container p-6 rounded-xl shadow-sm bg-white border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aktivitas Terbaru
          </h3>
          <div className="space-y-4">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse"
                  >
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                ))
              : recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <p
                      className="text-sm text-gray-700 truncate"
                      title={activity.prompt}
                    >
                      {activity.prompt}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {formatTimeAgo(activity.timestamp)}
                      {console.log(activity.timestamp)}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
