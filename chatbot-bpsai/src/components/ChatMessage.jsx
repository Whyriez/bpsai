import React, {
  createContext,
  useContext,
  memo,
  useRef,
  useState,
  useEffect,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportToExcel } from "../services/chatApi";

// SVG Icons
const ThumbsUpIcon = ({ selected }) => (
  <svg
    className={`w-4 h-4 ${selected ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"}`}
    fill={selected ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.25m-1.75 1.5h-2.25a.75.75 0 01-.75-.75V8.25c0-.414.336-.75.75-.75h2.25a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75z"
    />
  </svg>
);

const ThumbsDownIcon = ({ selected }) => (
  <svg
    className={`w-4 h-4 transform -scale-y-100 ${
      selected ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
    }`}
    fill={selected ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.25m-1.75 1.5h-2.25a.75.75 0 01-.75-.75V8.25c0-.414.336-.75.75-.75h2.25a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75z"
    />
  </svg>
);

const CopyIcon = () => (
  <svg
    className="w-4 h-4 text-slate-400 dark:text-slate-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-emerald-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const TableContext = createContext({ isInsideTable: false });

const MarkdownLink = memo(({ href, children }) => {
  const { isInsideTable } = useContext(TableContext);

  if (isInsideTable) {
    return <TableLink href={href} />;
  }
  return <StyledLink href={href}>{children}</StyledLink>;
});

const StyledLink = memo(({ href, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      className="flex items-center justify-between gap-3.5 w-full no-underline bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-all group my-2 shadow-2xs"
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
          {children}
        </span>
      </div>
      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 shrink-0 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
        <span>Buka Publikasi</span>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>
  );
});

const TableLink = memo(({ href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 no-underline hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded-md text-xs transition-colors"
  >
    <span>Sumber</span>
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  </a>
));

const ExportButton = memo(({ onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all shadow-2xs hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
    title="Ekspor tabel ke format Excel (.xlsx)"
  >
    {isLoading ? (
      <>
        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Mengekspor...</span>
      </>
    ) : (
      <>
        <svg
          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Unduh Excel</span>
      </>
    )}
  </button>
));

const ExportableTable = ({ children }) => {
  const tableContainerRef = useRef(null);
  const [tableTitle, setTableTitle] = useState("Tabel Statistik");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    const prevEl = tableContainerRef.current.previousElementSibling;
    if (
      prevEl &&
      (prevEl.tagName === "P" ||
        prevEl.tagName.match(/^H[1-6]$/i) ||
        prevEl.tagName === "STRONG" ||
        prevEl.tagName === "EM")
    ) {
      const text = prevEl.textContent.trim();
      // Deteksi jika elemen tepat di atas tabel adalah keterangan tabel (misal: "Tabel dari Halaman 126", "Tabel 1.1", dll)
      if (
        text &&
        (text.toLowerCase().startsWith("tabel") ||
          text.toLowerCase().includes("halaman") ||
          text.length <= 90)
      ) {
        setTableTitle(text.replace(/^[:\-\s]+|[:\-\s]+$/g, ""));
        prevEl.style.display = "none"; // Sembunyikan elemen terpisah di atas agar menyatu sejajar
      }
    }
  }, [children]);

  const handleExport = async () => {
    if (!tableContainerRef.current) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const tableElement = tableContainerRef.current.querySelector("table");
      if (!tableElement) throw new Error("Elemen tabel tidak ditemukan.");

      let title =
        tableTitle !== "Tabel Statistik" ? tableTitle : "data_statistik_bps";
      const messageContainer = tableContainerRef.current.closest(
        '[class*="rounded-2xl"]',
      );

      if (messageContainer && title === "data_statistik_bps") {
        const possibleTitleElements = messageContainer.querySelectorAll(
          "h1, h2, h3, h4, h5, h6, strong",
        );
        for (let element of possibleTitleElements) {
          if (
            messageContainer.contains(element) &&
            element.textContent.trim()
          ) {
            title = element.textContent.trim();
            if (element.tagName.match(/^H[1-6]$/i)) {
              break;
            }
          }
        }
      }

      const headers = Array.from(tableElement.querySelectorAll("thead th"))
        .map((th) => th.innerText.trim())
        .join(" | ");

      const separator = Array.from(tableElement.querySelectorAll("thead th"))
        .map(() => "---")
        .join(" | ");

      const rows = Array.from(tableElement.querySelectorAll("tbody tr")).map(
        (tr) =>
          Array.from(tr.querySelectorAll("td"))
            .map((td) => td.innerText.trim())
            .join(" | "),
      );

      const markdownString = `| ${headers} |\n| ${separator} |\n${rows
        .map((r) => `| ${r} |`)
        .join("\n")}`;

      const blob = await exportToExcel(markdownString, title);

      const safeFilename = title
        .replace(/[^a-z0-9\u00C0-\u024F\s]/gi, "_")
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 100);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFilename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(error.message);
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="overflow-hidden my-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs bg-white dark:bg-slate-800/90 not-prose"
      ref={tableContainerRef}
    >
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="leading-snug break-words whitespace-normal">{tableTitle}</span>
        </div>
        <div className="shrink-0 self-end sm:self-auto">
          <ExportButton onClick={handleExport} isLoading={isExporting} />
        </div>
      </div>

      <div className="overflow-x-auto">{children}</div>

      {exportError && (
        <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 p-2 border-t border-rose-200 dark:border-rose-900">
          Error: {exportError}
        </div>
      )}
    </div>
  );
};

const ChatMessage = memo(
  ({ message, isLoading, isLatest = true, thinkingStatus, onFeedback }) => {
    const isUser = message.sender === "user";
    const isAI = message.sender === "ai";
    const [copied, setCopied] = useState(false);

    // Jangan render jika pesan AI kosong dan sudah tidak aktif loading
    if (isAI && !message.text && (!isLoading || !isLatest)) {
      return null;
    }

    const isStreaming = isAI && isLoading && isLatest && !!message.text;
    const hasFeedback =
      message.feedbackGiven === "positive" ||
      message.feedbackGiven === "negative";

    const handleCopy = () => {
      if (!message.text) return;
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        className={`flex items-start gap-3 message-animation ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        {/* AI Avatar */}
        {isAI && (
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs flex-shrink-0 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`min-w-0 max-w-full ${isUser ? "max-w-2xl ml-auto" : "flex-1"}`}
        >
          <div
            className={`rounded-2xl p-4 shadow-sm border min-w-0 ${
              !isStreaming ? "hover-lift message-animation" : ""
            } ${
              isUser
                ? "bg-bps-light-blue dark:bg-blue-900 border-blue-200 dark:border-blue-800 text-gray-800 dark:text-white rounded-tr-md max-w-2xl"
                : "bg-white dark:bg-slate-800/90 border border-blue-100/80 dark:border-slate-700/80 rounded-tl-md text-slate-800 dark:text-slate-100"
            }`}
          >
            {isAI && !message.text ? (
              <div className="flex items-center gap-2.5 py-1 text-slate-600 dark:text-slate-300">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span className="text-xs font-medium animate-pulse">
                  {thinkingStatus?.detail ||
                    "Sedang memproses dan mencari data statistik..."}
                </span>
              </div>
            ) : (
              <div
                className={`prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:leading-relaxed prose-li:my-0.5 ${
                  isStreaming ? "streaming-cursor" : ""
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ ...props }) => (
                      <ExportableTable>
                        <table
                          {...props}
                          className="text-xs sm:text-sm w-full border-collapse"
                          style={{ margin: 0 }}
                        />
                      </ExportableTable>
                    ),
                    thead: ({ ...props }) => (
                      <thead
                        {...props}
                        className="bg-slate-100 dark:bg-slate-700/70 border-b border-slate-200 dark:border-slate-700"
                      />
                    ),
                    th: ({ ...props }) => (
                      <th
                        {...props}
                        className="px-3.5 py-2.5 font-bold text-left text-slate-900 dark:text-slate-100"
                      />
                    ),
                    tbody: ({ ...props }) => (
                      <tbody
                        {...props}
                        className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60"
                      />
                    ),
                    tr: ({ ...props }) => (
                      <tr
                        {...props}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/40"
                      />
                    ),
                    td: ({ ...props }) => (
                      <td className="px-3.5 py-2.5 align-middle text-slate-800 dark:text-slate-200">
                        <TableContext.Provider value={{ isInsideTable: true }}>
                          {props.children}
                        </TableContext.Provider>
                      </td>
                    ),
                    a: MarkdownLink,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Action Buttons underneath AI Message */}
          {isAI && !isLoading && (
            <div className="flex items-center gap-1.5 mt-1.5 px-1 text-slate-400">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 text-xs transition-colors"
                title="Salin jawaban"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                <span className="text-[11px]">
                  {copied ? "Tersalin!" : "Salin"}
                </span>
              </button>

              <span className="text-slate-300 dark:text-slate-600">•</span>

              {/* Feedback Thumbs */}
              {hasFeedback ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Feedback tercatat
                </span>
              ) : (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onFeedback(message.id, "positive")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 hover:text-emerald-500 transition-colors"
                    title="Jawaban akurat & membantu"
                  >
                    <ThumbsUpIcon />
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, "negative")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 hover:text-rose-500 transition-colors"
                    title="Jawaban kurang tepat"
                  >
                    <ThumbsDownIcon />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default ChatMessage;
