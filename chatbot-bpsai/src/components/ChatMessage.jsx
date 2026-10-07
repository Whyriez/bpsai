import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportToExcel } from "../services/chatApi";
import AiAvatar from "./AiAvatar";
import Icon from "./Icon";

const CopyIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 5H4v15h12v-4M8 2h12v14H8V2Z" />
  </svg>
);
const FeedbackIcon = ({ negative }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={negative ? { transform: "rotate(180deg)" } : undefined}
  >
    <path d="M7 10v11H3V10h4Zm0 0 5-8c3 0 2 4 1 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7" />
  </svg>
);

function MarkdownLink({ href, children }) {
  return (
    <a
      className="source-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <Icon name="external" size={11} />
    </a>
  );
}

function ExportableTable({ children }) {
  const tableRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    if (!tableRef.current || isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      const table = tableRef.current.querySelector("table");
      if (!table) throw new Error("Tabel tidak ditemukan.");
      const cellText = (cell) =>
        cell.innerText.trim().replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
      const headers = Array.from(table.querySelectorAll("thead th"), cellText);
      const rows = Array.from(table.querySelectorAll("tbody tr"), (row) =>
        Array.from(row.querySelectorAll("td"), cellText),
      );
      const markdown = [headers, headers.map(() => "---"), ...rows]
        .map((row) => `| ${row.join(" | ")} |`)
        .join("\n");
      const heading = tableRef.current
        .closest(".message-body")
        ?.querySelector("h1, h2, h3, h4");
      const title = heading?.textContent.trim() || "Tabel statistik BPS";
      const blob = await exportToExcel(markdown, title);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_")
        .slice(0, 100)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(
        error.message || "Tabel belum dapat diunduh. Silakan coba lagi.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="statistic-table" ref={tableRef}>
      <div className="table-toolbar">
        <span>Tabel statistik</span>
        <button
          className="button button-small button-outline"
          onClick={handleExport}
          disabled={isExporting}
          title="Unduh tabel dalam format Excel (.xlsx)"
        >
          {isExporting ? (
            <span className="spinner" />
          ) : (
            <Icon name="send" size={14} className="rotate-180" />
          )}
          {isExporting ? "Mengunduh…" : "Unduh Excel"}
        </button>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="Tabel statistik, geser untuk melihat seluruh kolom"
        tabIndex={0}
      >
        <table>{children}</table>
      </div>
      {exportError && (
        <div className="table-error" role="alert">
          {exportError}
        </div>
      )}
    </div>
  );
}

const markdownComponents = {
  a: MarkdownLink,
  table: ExportableTable,
};

const ChatMessage = memo(function ChatMessage({
  message,
  isLoading,
  isLatest = true,
  thinkingStatus,
  onFeedback,
}) {
  const isUser = message.sender === "user";
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  if (!isUser && !message.text && (!isLoading || !isLatest)) return null;
  const isStreaming = !isUser && isLoading && isLatest && !!message.text;
  const hasFeedback = !!message.feedbackGiven;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setCopyError(false);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  if (isUser)
    return (
      <article className="message-row message-user" aria-label="Pesan Anda">
        <div className="user-message">{message.text}</div>
      </article>
    );

  return (
    <article
      className="message-row message-assistant"
      aria-label="Jawaban SIGAP"
      aria-busy={isLoading}
    >
      <div className="assistant-identity">
        <AiAvatar />
        <strong>SIGAP</strong>
        <span>Asisten statistik</span>
      </div>
      <div className="message-body">
        {!message.text ? (
          <div className="thinking-status" role="status">
            <span className="spinner" />
            {thinkingStatus?.detail ||
              "Menelusuri data dan menyiapkan jawaban…"}
          </div>
        ) : (
          <div
            className={`message-prose ${isStreaming ? "streaming-cursor" : ""}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        {!isLoading && (
          <div className="message-actions">
            <button
              onClick={handleCopy}
              aria-label="Salin jawaban"
              title="Salin jawaban"
            >
              {copied ? <Icon name="check" size={15} /> : <CopyIcon />}
              <span aria-live="polite">
                {copied ? "Tersalin" : copyError ? "Gagal menyalin" : "Salin"}
              </span>
            </button>
            <span className="message-action-divider" />
            {hasFeedback ? (
              <span className="feedback-recorded">Masukan tercatat</span>
            ) : (
              <>
                <button
                  onClick={() => onFeedback?.(message.id, "positive")}
                  aria-label="Jawaban membantu"
                  title="Jawaban membantu"
                >
                  <FeedbackIcon />
                </button>
                <button
                  onClick={() => onFeedback?.(message.id, "negative")}
                  aria-label="Jawaban perlu diperbaiki"
                  title="Jawaban perlu diperbaiki"
                >
                  <FeedbackIcon negative />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

export default ChatMessage;
