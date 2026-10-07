// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import ChatInput from "../components/ChatInput";
import FeedbackModal from "../components/FeedbackModal";
import GoogleLoginModal from "../components/GoogleLoginModal";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import {
  getHistory,
  streamChat,
  submitFeedback,
  getUserConversations,
  deleteConversationApi,
  renameConversationApi,
  deleteAccountApi,
  togglePinConversationApi,
} from "../services/chatApi";

function ChatPage() {
  const {
    user,
    token,
    logout,
    isGuestLimitReached,
    remainingGuestChats,
    incrementGuestChatCount,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const initialPromptProcessedRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("sigap_theme") === "dark" ? "dark" : "light",
  );
  const [isCompactLayout, setIsCompactLayout] = useState(
    () => window.matchMedia("(max-width: 899px)").matches,
  );

  // State Sidebar & Modals
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 900px)").matches,
  );
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const [isGoogleLoginOpen, setIsGoogleLoginOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [conversations, setConversations] = useState([]);

  // State untuk pagination
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    hasMore: false,
    isLoadingMore: false,
  });

  // State untuk Thinking Status
  const [thinkingStatus, setThinkingStatus] = useState({
    isThinking: false,
    status: "",
    detail: "",
  });

  // State untuk Modal Feedback
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState({
    messageId: null,
    type: null,
  });

  // State untuk Notifikasi
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Refs untuk mengelola streaming & pembatalan
  const aiResponseAccumulator = useRef("");
  const abortControllerRef = useRef(null);

  // Efek untuk mengubah tema (dark mode)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sigap_theme", theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const updateLayout = (event) => {
      setIsCompactLayout(event.matches);
      setSidebarOpen(!event.matches);
    };
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  // Load daftar percakapan jika user sudah login
  const loadConversations = useCallback(async () => {
    if (!user || !user.id) {
      setConversations([]);
      return;
    }
    try {
      const list = await getUserConversations(user.id);
      setConversations(list);
    } catch (err) {
      console.error("Gagal memuat daftar percakapan:", err);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations, conversationId]);

  // Efek untuk memuat riwayat chat saat conversationId berubah
  useEffect(() => {
    const loadHistory = async () => {
      if (!conversationId) return;
      try {
        const response = await getHistory(
          conversationId,
          1,
          pagination.perPage,
        );
        if (!response.messages || response.messages.length === 0) {
          setMessages([]);
          setPagination((prev) => ({
            ...prev,
            page: 1,
            total: 0,
            hasMore: false,
          }));
          return;
        }

        const formattedHistory = response.messages.flatMap((item) => [
          {
            id: `user-${item.prompt_log_id}`,
            sender: "user",
            text: item.user_prompt,
            timestamp: Date.now(),
          },
          {
            id: item.prompt_log_id,
            sender: "ai",
            text: item.model_response,
            feedbackGiven: item.has_feedback,
            timestamp: Date.now() + 1,
          },
        ]);

        setMessages(formattedHistory);
        setPagination((prev) => ({
          ...prev,
          page: 1,
          total: response.pagination.total,
          hasMore: response.pagination.has_more,
        }));
      } catch (error) {
        console.error("Gagal memuat riwayat:", error);
        setAlert({
          show: true,
          message: "Gagal memuat riwayat chat.",
          type: "error",
        });
      }
    };
    loadHistory();
  }, [conversationId, pagination.perPage]);

  // Fungsi untuk load more messages
  const loadMoreMessages = useCallback(async () => {
    if (pagination.isLoadingMore || !pagination.hasMore) return;

    try {
      setPagination((prev) => ({ ...prev, isLoadingMore: true }));
      const nextPage = pagination.page + 1;
      const response = await getHistory(
        conversationId,
        nextPage,
        pagination.perPage,
      );

      const newMessages = response.messages.flatMap((item) => [
        {
          id: `user-${item.prompt_log_id}`,
          sender: "user",
          text: item.user_prompt,
          timestamp: Date.now() - 10000,
        },
        {
          id: item.prompt_log_id,
          sender: "ai",
          text: item.model_response,
          feedbackGiven: item.has_feedback,
          timestamp: Date.now() - 9000,
        },
      ]);

      setMessages((prev) => [...newMessages, ...prev]);
      setPagination((prev) => ({
        ...prev,
        page: nextPage,
        total: response.pagination.total,
        hasMore: response.pagination.has_more,
        isLoadingMore: false,
      }));
    } catch (error) {
      console.error("Gagal memuat lebih banyak pesan:", error);
      setPagination((prev) => ({ ...prev, isLoadingMore: false }));
    }
  }, [conversationId, pagination]);

  // Efek untuk menampilkan dan menyembunyikan notifikasi
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const updateLastAiMessage = useCallback(() => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.sender === "ai") {
        const updatedMessage = {
          ...lastMessage,
          text: aiResponseAccumulator.current,
        };
        return [...prev.slice(0, -1), updatedMessage];
      }
      return prev;
    });
  }, []);

  const handleSendMessage = useCallback(
    async (prompt) => {
      if (isLoading) return;

      // Cek batasan percakapan tamu (maksimal 2x percakapan)
      if (!user && isGuestLimitReached) {
        setIsGoogleLoginOpen(true);
        setAlert({
          show: true,
          message:
            "Anda sudah menggunakan 2 pertanyaan sebagai tamu. Masuk dengan Google untuk melanjutkan.",
          type: "error",
        });
        return;
      }

      // Jika pengguna tamu (non-login), tambahkan counter
      if (!user) {
        incrementGuestChatCount();
      }

      abortControllerRef.current = new AbortController();
      aiResponseAccumulator.current = "";

      const userMessage = {
        id: crypto.randomUUID(),
        text: prompt,
        sender: "user",
        timestamp: Date.now(),
      };
      const aiPlaceholder = {
        id: crypto.randomUUID(),
        text: "",
        sender: "ai",
        timestamp: Date.now() + 1,
      };

      setMessages((prev) => [...prev, userMessage, aiPlaceholder]);
      setIsLoading(true);
      setThinkingStatus({ isThinking: true, status: "", detail: "" });

      try {
        await streamChat(
          {
            prompt,
            conversation_id: conversationId,
            user_id: user?.id || null,
          },
          (chunkOrData) => {
            try {
              if (!chunkOrData) return;

              // Kasus 1: chatApi mengirim parsed JSON object
              if (typeof chunkOrData === "object") {
                const data = chunkOrData;
                if (data.thinking === true) {
                  setThinkingStatus({
                    isThinking: true,
                    status: data.status || "",
                    detail: data.detail || "",
                  });
                } else if (data.thinking === false) {
                  setThinkingStatus({
                    isThinking: false,
                    status: "",
                    detail: "",
                  });
                } else if (data.text) {
                  aiResponseAccumulator.current += data.text;
                  updateLastAiMessage();
                }
                return;
              }

              // Kasus 2: Fallback jika raw string
              const lines = String(chunkOrData).split("\n");
              lines.forEach((line) => {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const jsonStr = trimmed.substring(6).trim();
                  if (jsonStr && jsonStr !== "[DONE]") {
                    const data = JSON.parse(jsonStr);
                    if (data.thinking === true) {
                      setThinkingStatus({
                        isThinking: true,
                        status: data.status || "",
                        detail: data.detail || "",
                      });
                    } else if (data.thinking === false) {
                      setThinkingStatus({
                        isThinking: false,
                        status: "",
                        detail: "",
                      });
                    } else if (data.text) {
                      aiResponseAccumulator.current += data.text;
                      updateLastAiMessage();
                    }
                  }
                }
              });
            } catch (e) {
              console.warn("Error parsing stream chunk:", e);
            }
          },
          (error) => {
            if (
              error.code === "GUEST_LIMIT_REACHED" ||
              (error.message && error.message.includes("Batas 2x percakapan"))
            ) {
              setIsGoogleLoginOpen(true);
              setAlert({
                show: true,
                message:
                  "Batas pertanyaan tamu telah tercapai. Masuk dengan Google untuk melanjutkan.",
                type: "error",
              });
            }
            aiResponseAccumulator.current = `Terjadi kesalahan: ${error.message}`;
            updateLastAiMessage();
            setThinkingStatus({ isThinking: false, status: "", detail: "" });
          },
          abortControllerRef.current.signal,
        );

        // Refresh list conversations if user is logged in
        if (user && user.id) {
          setTimeout(loadConversations, 1000);
        }
      } finally {
        setIsLoading(false);
        setThinkingStatus({ isThinking: false, status: "", detail: "" });
        abortControllerRef.current = null;
      }
    },
    [
      isLoading,
      user,
      isGuestLimitReached,
      incrementGuestChatCount,
      conversationId,
      loadConversations,
      updateLastAiMessage,
    ],
  );

  // Efek untuk memicu pertanyaan otomatis jika dialihkan dari Short Link Dokumen
  useEffect(() => {
    if (
      location.state?.initialPrompt &&
      !initialPromptProcessedRef.current &&
      !isLoading
    ) {
      initialPromptProcessedRef.current = true;
      const promptText = location.state.initialPrompt;
      window.history.replaceState({}, document.title);
      handleSendMessage(promptText);
    }
  }, [location.state, isLoading, handleSendMessage]);

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setThinkingStatus({ isThinking: false, status: "", detail: "" });
      setMessages((prev) =>
        prev.filter((msg) => !(msg.sender === "ai" && msg.text === "")),
      );
    }
  };

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    navigate(`/chat/${newId}`);
    if (isCompactLayout) setSidebarOpen(false);
  };

  const handleDeleteConversation = async (targetConvId) => {
    try {
      await deleteConversationApi(targetConvId, user?.id);
      setConversations((prev) =>
        prev.filter((c) => c.conversation_id !== targetConvId),
      );
      setAlert({
        show: true,
        message: "Percakapan berhasil dihapus.",
        type: "success",
      });

      if (targetConvId === conversationId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Gagal menghapus percakapan:", err);
      setAlert({
        show: true,
        message: "Gagal menghapus percakapan.",
        type: "error",
      });
    }
  };

  const handleRenameConversation = async (targetConvId, newTitle) => {
    try {
      const res = await renameConversationApi(targetConvId, newTitle, user?.id);
      if (res) {
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === targetConvId ? { ...c, title: newTitle } : c,
          ),
        );
        setAlert({
          show: true,
          message: "Judul percakapan berhasil diperbarui.",
          type: "success",
        });
      }
    } catch (err) {
      console.error("Gagal mengubah nama percakapan:", err);
      setAlert({
        show: true,
        message: "Gagal mengubah nama percakapan.",
        type: "error",
      });
    }
  };

  const handleTogglePinConversation = async (targetConvId, isPinned) => {
    if (!targetConvId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === targetConvId ? { ...c, is_pinned: isPinned } : c,
      ),
    );
    try {
      await togglePinConversationApi(targetConvId, isPinned, user?.id);
    } catch (err) {
      console.error("Gagal menyematkan percakapan:", err);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === targetConvId
            ? { ...c, is_pinned: !isPinned }
            : c,
        ),
      );
    }
  };

  const confirmDeleteAccount = async () => {
    if (!user || !user.id) return;

    try {
      await deleteAccountApi(user.id, token);
      logout();
      setConversations([]);
      setMessages([]);
      setAlert({
        show: true,
        message: "Akun Anda beserta seluruh riwayat berhasil dihapus.",
        type: "success",
      });
      handleNewChat();
    } catch (err) {
      console.error("Gagal menghapus akun:", err);
      setAlert({
        show: true,
        message: err.message || "Gagal menghapus akun.",
        type: "error",
      });
    } finally {
      setIsDeleteAccountModalOpen(false);
    }
  };

  const openFeedbackModal = (messageId, feedbackType) => {
    setCurrentFeedback({ messageId, type: feedbackType });
    setIsFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
  };

  const handleFeedbackSubmit = async (comment) => {
    const { messageId, type } = currentFeedback;
    if (!messageId || !type) return;

    try {
      await submitFeedback({
        prompt_log_id: messageId,
        type: type,
        comment: comment || null,
        session_id: conversationId,
      });
      setAlert({
        show: true,
        message: "Terima kasih! Feedback Anda telah berhasil dikirim.",
        type: "success",
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedbackGiven: type } : msg,
        ),
      );
    } catch (error) {
      console.error("Gagal mengirim feedback:", error);
      setAlert({
        show: true,
        message: "Gagal mengirim feedback. Silakan coba lagi.",
        type: "error",
      });
    } finally {
      closeFeedbackModal();
    }
  };

  return (
    <div className="chat-page">
      {alert.show && (
        <div
          className={`toast ${alert.type === "error" ? "is-error" : ""}`}
          role={alert.type === "error" ? "alert" : "status"}
        >
          <Icon name={alert.type === "error" ? "info" : "check"} size={17} />
          {alert.message}
        </div>
      )}

      <div className="app-shell">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          conversations={conversations}
          activeConversationId={conversationId}
          onSelectConversation={(id) => {
            navigate(`/chat/${id}`);
            if (window.innerWidth < 900) {
              setSidebarOpen(false);
            }
          }}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onTogglePinConversation={handleTogglePinConversation}
          user={user}
          onOpenGoogleLogin={() => setIsGoogleLoginOpen(true)}
          onSelectTopic={(query) => {
            handleSendMessage(query);
            if (window.innerWidth < 900) {
              setSidebarOpen(false);
            }
          }}
          isLoading={isLoading}
        />

        {/* Main Section */}
        <div className="app-main" inert={sidebarOpen && isCompactLayout}>
          <Header
            onThemeToggle={handleToggleTheme}
            theme={theme}
            sidebarOpen={sidebarOpen}
            title={
              conversations.find(
                (conversation) =>
                  conversation.conversation_id === conversationId,
              )?.title
            }
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenGoogleLogin={() => setIsGoogleLoginOpen(true)}
            onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
          />
          <main className="chat-main">
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              thinkingStatus={thinkingStatus}
              onFeedback={openFeedbackModal}
              onLoadMore={loadMoreMessages}
              pagination={pagination}
              onSelectPrompt={handleSendMessage}
            />
            <ChatInput
              key={conversationId}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onCancel={handleCancelGeneration}
              isGuestLimitReached={isGuestLimitReached}
              remainingGuestChats={remainingGuestChats}
              isLoggedIn={!!user}
              onOpenGoogleLogin={() => setIsGoogleLoginOpen(true)}
            />
          </main>
        </div>
      </div>

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={closeFeedbackModal}
        onSubmit={handleFeedbackSubmit}
        feedbackType={currentFeedback.type}
      />

      <GoogleLoginModal
        isOpen={isGoogleLoginOpen}
        onClose={() => setIsGoogleLoginOpen(false)}
        onSuccess={() => {
          setAlert({
            show: true,
            message: "Berhasil masuk via Google!",
            type: "success",
          });
          loadConversations();
        }}
      />

      <ConfirmModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={confirmDeleteAccount}
        title="Hapus Akun Permanen"
        message="Apakah Anda yakin ingin menghapus akun ini? Seluruh data profil dan riwayat percakapan Anda akan dihapus secara permanen dan tidak dapat dikembalikan."
        confirmText="Hapus Akun Saya"
        confirmVariant="danger"
      />
    </div>
  );
}

export default ChatPage;
