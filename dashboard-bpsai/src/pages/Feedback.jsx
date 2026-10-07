import React, { useEffect, useState } from "react";
import FeedbackItem from "../components/feedback/FeedbackItem";
import apiFetch from "../services/api";

export default function Feedback() {
  const [stats, setStats] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    items: [],
    totalPages: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        const data = await apiFetch("/feedback");
        setStats(data.stats);
        setFeedbackData(data.feedback);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbackData();
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= feedbackData.totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading) {
    return <div className="text-center p-10">Memuat data feedback...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div id="feedback" className="section fade-in space-y-6">
      <div className="page-intro">
        <div>
          <p className="page-eyebrow">Pemantauan layanan</p>
          <h1>Umpan Balik Pengguna</h1>
          <p>Pantau kepuasan pengguna dan peluang peningkatan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-line">
          <h4 className="font-semibold text-ink mb-3">Tingkat Kepuasan</h4>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {stats?.satisfactionRate || 0}%
            </div>
            <div className="text-sm text-muted">Feedback Positif</div>
            <div className="text-xs text-faint mt-2">
              Berdasarkan {stats?.totalReviews || 0} ulasan
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl shadow-sm border border-line">
          <h4 className="font-semibold text-ink mb-3">Analisis Sentimen</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Positif</span>
              <span className="text-sm font-medium text-green-600">
                {stats?.positivePercentage || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Negatif</span>
              <span className="text-sm font-medium text-red-600">
                {stats?.negativePercentage || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl shadow-sm border border-line">
          <h4 className="font-semibold text-ink mb-3">Tingkat Respons</h4>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">
              {stats?.responseRate || 0}%
            </div>
            <div className="text-sm text-muted">
              Pengguna memberikan feedback
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-xl shadow-sm border border-line mb-6">
        <h3 className="text-lg font-semibold text-ink mb-4">
          Feedback Terbaru
        </h3>
        <div className="space-y-4">
          {feedbackData.items.length > 0 ? (
            feedbackData.items.map((item) => (
              <FeedbackItem key={item.id} {...item} />
            ))
          ) : (
            <p className="text-sm text-muted">Belum ada feedback yang masuk.</p>
          )}
        </div>

        {feedbackData.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-line">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-muted bg-surface border border-line-strong rounded-md hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-ink">
              Halaman <strong>{currentPage}</strong> dari{" "}
              <strong>{feedbackData.totalPages}</strong>
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === feedbackData.totalPages}
              className="px-4 py-2 text-sm font-medium text-muted bg-surface border border-line-strong rounded-md hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
