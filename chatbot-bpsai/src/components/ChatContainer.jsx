import React, { useEffect, useRef, useState, useCallback } from "react";
import ChatMessage from "./ChatMessage.jsx";

const SUGGESTED_PROMPTS = [
  {
    title: "Tingkat Pengangguran (TPT)",
    prompt: "Berapa Tingkat Pengangguran Terbuka (TPT) Provinsi Gorontalo tahun 2024?",
    tag: "Ketenagakerjaan",
    icon: (
      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    title: "Profil Kemiskinan",
    prompt: "Bagaimana persentase dan jumlah penduduk miskin di Gorontalo tahun 2023-2024?",
    tag: "Sosial",
    icon: (
      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    title: "Pertumbuhan Ekonomi (PDRB)",
    prompt: "Berapa laju pertumbuhan ekonomi (PDRB) Gorontalo terbaru?",
    tag: "Ekonomi",
    icon: (
      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  },
  {
    title: "Nilai Tukar Petani (NTP)",
    prompt: "Berapa Nilai Tukar Petani (NTP) Provinsi Gorontalo?",
    tag: "Pertanian",
    icon: (
      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

const HeroGreeting = ({ onSelectPrompt }) => (
  <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-fadeIn">
    {/* Badge Portal */}
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
      <span>BPS PROVINSI GORONTALO</span>
    </div>

    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
      Asisten Cerdas Data Statistik
    </h1>
    <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
      Dapatkan data resmi, angka indikator pembangunan, dan ringkasan publikasi BPS secara instan, akurat, dan terverifikasi.
    </p>

    {/* Prompt Starter Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left">
      {SUGGESTED_PROMPTS.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
          className="group p-4 bg-white dark:bg-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-slate-700/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm transition-all duration-200 flex flex-col justify-between active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {item.tag}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {item.prompt}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Tanyakan sekarang</span>
            <svg className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const MinimalThinkingPill = ({ detail }) => (
  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm max-w-fit animate-fadeIn">
    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
      {detail || "Memproses dan mencari data statistik..."}
    </span>
  </div>
);

const LoadMoreButton = ({ onLoadMore, isLoading }) => (
  <div className="flex justify-center py-4">
    <button
      onClick={onLoadMore}
      disabled={isLoading}
      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-all shadow-sm"
    >
      {isLoading ? "Memuat..." : "Muat Pesan Sebelumnya"}
    </button>
  </div>
);

const ChatContainer = ({
  messages,
  isLoading,
  thinkingStatus,
  onFeedback,
  onLoadMore,
  pagination,
  onSelectPrompt
}) => {
  const endOfMessagesRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(messages.length);
  const previousScrollHeightRef = useRef(0);
  const userScrolledAwayRef = useRef(false);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior = "auto") => {
    if (scrollContainerRef.current) {
      if (behavior === "smooth") {
        endOfMessagesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = scrollBottom < 100;

    if (!nearBottom) {
      userScrolledAwayRef.current = true;
      setIsAutoScroll(false);
    } else {
      userScrolledAwayRef.current = false;
      setIsAutoScroll(true);
    }

    if (scrollTop === 0 && pagination?.hasMore && !pagination?.isLoadingMore) {
      onLoadMore();
    }
  }, [pagination?.hasMore, pagination?.isLoadingMore, onLoadMore]);

  useEffect(() => {
    const hasNewMessage = messages.length > lastMessageCountRef.current;
    const isLoadingMore = pagination?.isLoadingMore;

    if (isLoadingMore) {
      const currentScrollHeight = scrollContainerRef.current?.scrollHeight || 0;
      const scrollDiff = currentScrollHeight - previousScrollHeightRef.current;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollDiff;
      }
    } else if (hasNewMessage && !userScrolledAwayRef.current) {
      scrollToBottom("smooth");
    } else if (isLoading && isAutoScroll) {
      scrollToBottom("auto");
    }

    lastMessageCountRef.current = messages.length;
    previousScrollHeightRef.current = scrollContainerRef.current?.scrollHeight || 0;
  }, [messages, isLoading, isAutoScroll, pagination?.isLoadingMore, scrollToBottom]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 sm:p-6 chat-scroll bg-slate-50/50 dark:bg-slate-900"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Load More Button */}
        {pagination?.hasMore && (
          <LoadMoreButton
            onLoadMore={onLoadMore}
            isLoading={pagination.isLoadingMore}
          />
        )}

        {/* Hero Greeting on Empty State */}
        {messages.length === 0 && (
          <HeroGreeting onSelectPrompt={onSelectPrompt} />
        )}

        {/* Chat Messages */}
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
  );
};

export default ChatContainer;