import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import apiFetch from "../services/api";

// Registrasi komponen Chart.js yang akan digunakan
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- KOMPONEN KECIL & SKELETON ---

const KeywordTag = ({ keyword, count, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`${colorClasses[color]} px-3 py-2 rounded-lg text-center`}>
      <div className="font-semibold capitalize">{keyword}</div>
      <div className="text-xs">{count} queries</div>
    </div>
  );
};

const SkeletonCard = ({ className = "" }) => (
  <div
    className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse ${className}`}
  >
    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-300 rounded w-full"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    </div>
  </div>
);

// --- KOMPONEN UTAMA ---

export default function Analytics() {
  const chartRef = useRef(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // --- Data Fetching untuk Semua Analytics ---
    const fetchAnalyticsData = async () => {
      try {
        const data = await apiFetch("/analytics/all");
        setAnalyticsData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    let chartInstance = null;
    if (chartRef.current && analyticsData?.usageTrends) {
      chartInstance = new ChartJS(chartRef.current, {
        type: "line",
        data: {
          labels: analyticsData.usageTrends.labels,
          datasets: analyticsData.usageTrends.datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "end",
              labels: {
                boxWidth: 12,
                font: {
                  size: 12,
                },
              },
            },
          },
          scales: {
            y: {
              grid: { drawBorder: false },
              ticks: { color: "#6b7280" },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#6b7280" },
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
        },
      });
    }
    // Cleanup chart saat komponen di-unmount atau data berubah
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [analyticsData]);

  const keywordColors = ["blue", "green", "yellow", "purple", "red", "indigo"];


  const formatAverageTime = (ms) => {
    if (ms === undefined || ms === null) {
      return "-";
    }
    if (ms < 1000) {
      return `${ms}ms`; 
    }
    return `${(ms / 1000).toFixed(2)} detik`;
  };
  
  return (
    <div id="analytics" className="section fade-in space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analisis Lanjutan
        </h2>
        <p className="text-gray-600">
          Wawasan mendalam tentang perilaku pengguna dan kinerja chatbot
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          Failed to load analytics data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tren Penggunaan
          </h3>
          <div className="h-64">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Analisis Waktu Respons
            </h3>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-blue-600">
                {formatAverageTime(analyticsData.responseTime.average)}
              </div>
              <div className="text-sm text-gray-600">
                Waktu Respons Rata-rata
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">&lt; 2 detik</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${analyticsData.responseTime.distribution.fast}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {analyticsData.responseTime.distribution.fast}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">2 - 5 detik</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${analyticsData.responseTime.distribution.medium}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {analyticsData.responseTime.distribution.medium}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">&gt; 5 detik</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${analyticsData.responseTime.distribution.slow}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {analyticsData.responseTime.distribution.slow}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonCard className="h-36" />
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Kata Kunci dan Topik Teratas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {analyticsData.topKeywords.map((item, index) => (
              <KeywordTag
                key={item.keyword}
                keyword={item.keyword}
                count={item.count}
                color={keywordColors[index % keywordColors.length]}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">
                Tingkat Keberhasilan Pengambilan Kembali
              </h4>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {analyticsData.retrievalSuccessRate}%
                </div>
                <div className="text-sm text-gray-600">
                  Data berhasil diambil
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Cakupan Data</h4>
              <div className="space-y-2">
                {analyticsData.dataCoverage.map((item) => (
                  <div key={item.year} className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {item.year} Data
                    </span>
                    <span className="text-sm font-medium">
                      {item.coverage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">
                Kinerja Layanan
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Waktu aktif</span>
                  <span className="text-sm font-medium text-green-600">
                    {analyticsData.servicePerformance.uptime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ketepatan</span>
                  <span className="text-sm font-medium text-blue-600">
                    {analyticsData.servicePerformance.accuracy}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Kepuasan Pengguna
                  </span>
                  <span className="text-sm font-medium text-purple-600">
                    {analyticsData.servicePerformance.userSatisfaction}/5
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
