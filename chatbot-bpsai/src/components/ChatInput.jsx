import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";

export default function ChatInput({
  onSendMessage,
  isLoading,
  onCancel,
  isGuestLimitReached = false,
  remainingGuestChats = null,
  isLoggedIn = false,
  onOpenGoogleLogin,
}) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [prompt]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isGuestLimitReached) {
      onOpenGoogleLogin?.();
      return;
    }
    if (prompt.trim() && !isLoading) {
      onSendMessage(prompt.trim());
      setPrompt("");
    }
  };

  return (
    <div className="composer-area">
      <div className="composer-width">
        {isGuestLimitReached && (
          <div className="guest-limit-banner" role="status">
            <Icon name="lock" size={18} />
            <p>
              Anda sudah menggunakan 2 pertanyaan sebagai tamu. Masuk untuk
              melanjutkan.
            </p>
            <button
              type="button"
              onClick={onOpenGoogleLogin}
              className="text-button"
            >
              Masuk
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="composer">
          <label htmlFor="chat-prompt" className="sr-only">
            Pertanyaan untuk SIGAP
          </label>
          <textarea
            id="chat-prompt"
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              )
                handleSubmit(event);
            }}
            disabled={isLoading || isGuestLimitReached}
            placeholder={
              isGuestLimitReached
                ? "Masuk untuk melanjutkan percakapan"
                : isLoading
                  ? "SIGAP sedang menyiapkan jawaban…"
                  : "Apa yang ingin Anda ketahui tentang Gorontalo?"
            }
          />
          <div className="composer-toolbar">
            <span className="composer-hint">
              <Icon name="info" size={14} />
              Sebutkan wilayah dan periode data yang Anda cari.
            </span>
            {isLoading ? (
              <button
                type="button"
                className="send-button stop-button"
                onClick={onCancel}
                title="Hentikan jawaban"
                aria-label="Hentikan jawaban"
              >
                <span />
              </button>
            ) : isGuestLimitReached ? (
              <button
                type="button"
                onClick={onOpenGoogleLogin}
                className="send-button"
                title="Masuk untuk melanjutkan"
                aria-label="Masuk untuk melanjutkan"
              >
                <Icon name="lock" size={17} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="send-button"
                title="Kirim pertanyaan"
                aria-label="Kirim pertanyaan"
              >
                <Icon name="send" size={20} />
              </button>
            )}
          </div>
        </form>
        <div className="composer-meta">
          <span>
            {isLoggedIn ? (
              "Percakapan tersimpan di akun Anda"
            ) : (
              <>
                Mode tamu
                {remainingGuestChats !== null &&
                  ` · ${remainingGuestChats} pertanyaan tersisa`}
                <button type="button" onClick={onOpenGoogleLogin}>
                  Masuk
                </button>
              </>
            )}
          </span>
          <span className="keyboard-hint">
            Enter untuk kirim <span>·</span> Shift + Enter untuk baris baru
          </span>
        </div>
        <p className="composer-note">
          Periksa kembali angka dan periode pada sumber BPS yang dirujuk.
        </p>
      </div>
    </div>
  );
}
