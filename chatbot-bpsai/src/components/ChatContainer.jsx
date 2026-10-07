import { useEffect, useRef, useState, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import Icon from "./Icon";

const SUGGESTED_PROMPTS = [
  {
    title: "Ketenagakerjaan",
    description: "Tingkat pengangguran dan angkatan kerja",
    icon: "briefcase",
    prompt:
      "Berapa Tingkat Pengangguran Terbuka (TPT) Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    title: "Kemiskinan & kesejahteraan",
    description: "Penduduk miskin dan pembangunan manusia",
    icon: "people",
    prompt:
      "Bagaimana data kemiskinan dan Indeks Pembangunan Manusia (IPM) Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    title: "Pertumbuhan ekonomi",
    description: "PDRB dan perkembangan ekonomi daerah",
    icon: "chart",
    prompt:
      "Bagaimana pertumbuhan ekonomi (PDRB) Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    title: "Inflasi & harga",
    description: "Perubahan harga dan indeks harga konsumen",
    icon: "trend",
    prompt:
      "Berapa angka inflasi Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
];

function Welcome({ onSelectPrompt, isLoading }) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-eyebrow">
        <span />
        BPS PROVINSI GORONTALO
      </div>
      <h1 id="welcome-title">
        Temukan data.
        <br />
        <span>Pahami Gorontalo.</span>
      </h1>
      <p className="welcome-description">
        Telusuri indikator statistik, temukan publikasi, dan pahami data
        Gorontalo bersama SIGAP.
      </p>
      <div className="welcome-topics-heading">
        <h2>Mulai dari topik yang Anda butuhkan</h2>
        <span>Contoh pertanyaan</span>
      </div>
      <div className="suggested-topics">
        {SUGGESTED_PROMPTS.map((item) => (
          <button
            key={item.title}
            className="suggested-topic"
            onClick={() => onSelectPrompt?.(item.prompt)}
            disabled={isLoading}
          >
            <Icon name={item.icon} size={21} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <Icon name="arrow" size={17} className="topic-arrow" />
          </button>
        ))}
      </div>
      <p className="welcome-source">
        <Icon name="book" size={16} />
        Penelusuran data dan publikasi Badan Pusat Statistik
      </p>
    </section>
  );
}

export default function ChatContainer({
  messages,
  isLoading,
  thinkingStatus,
  onFeedback,
  onLoadMore,
  pagination,
  onSelectPrompt,
}) {
  const endOfMessagesRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(messages.length);
  const previousScrollHeightRef = useRef(0);
  const loadingHistoryRef = useRef(false);
  const userScrolledAwayRef = useRef(false);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const container = scrollContainerRef.current;
    if (container)
      container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    userScrolledAwayRef.current = !nearBottom;
    setIsAutoScroll(nearBottom);
    if (
      container.scrollTop === 0 &&
      pagination?.hasMore &&
      !pagination?.isLoadingMore
    )
      onLoadMore?.();
  }, [pagination?.hasMore, pagination?.isLoadingMore, onLoadMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (pagination?.isLoadingMore) {
      if (!loadingHistoryRef.current)
        previousScrollHeightRef.current = container.scrollHeight;
      loadingHistoryRef.current = true;
    } else if (loadingHistoryRef.current) {
      container.scrollTop +=
        container.scrollHeight - previousScrollHeightRef.current;
      loadingHistoryRef.current = false;
    } else if (
      messages.length > lastMessageCountRef.current &&
      !userScrolledAwayRef.current
    ) {
      scrollToBottom("smooth");
    } else if (isLoading && isAutoScroll) {
      scrollToBottom();
    }
    lastMessageCountRef.current = messages.length;
  }, [
    messages,
    isLoading,
    isAutoScroll,
    pagination?.isLoadingMore,
    scrollToBottom,
  ]);

  return (
    <div className="conversation-stage">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`chat-scroll ${messages.length ? "has-messages" : "is-empty"}`}
        role="region"
        aria-label="Percakapan dengan SIGAP"
        tabIndex={0}
      >
        <div className="conversation-content">
          {pagination?.hasMore && (
            <div className="load-history">
              <button
                className="button button-outline button-small"
                onClick={onLoadMore}
                disabled={pagination.isLoadingMore}
              >
                {pagination.isLoadingMore
                  ? "Memuat pesan…"
                  : "Muat pesan sebelumnya"}
              </button>
            </div>
          )}
          {messages.length === 0 && (
            <Welcome onSelectPrompt={onSelectPrompt} isLoading={isLoading} />
          )}
          {messages.map((message, index) => {
            const isLatest = index === messages.length - 1;
            return (
              <ChatMessage
                key={message.id}
                message={message}
                isLoading={isLoading && isLatest}
                isLatest={isLatest}
                thinkingStatus={isLatest ? thinkingStatus : null}
                onFeedback={onFeedback}
              />
            );
          })}
          <div ref={endOfMessagesRef} />
        </div>
      </div>
      {!isAutoScroll && messages.length > 0 && (
        <button
          className="scroll-to-bottom icon-button"
          aria-label="Ke pesan terbaru"
          title="Ke pesan terbaru"
          onClick={() => {
            userScrolledAwayRef.current = false;
            setIsAutoScroll(true);
            scrollToBottom("smooth");
          }}
        >
          <Icon name="send" className="rotate-180" size={18} />
        </button>
      )}
    </div>
  );
}
