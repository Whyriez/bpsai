// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import ChatInput from "../components/ChatInput";
import FeedbackModal from "../components/FeedbackModal";
import GoogleLoginModal from "../components/GoogleLoginModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import {
  getHistory,
  streamChat,
  submitFeedback,
  getUserConversations,
  deleteUserConversation,
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
  const { conversationId } = useParams();

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  
  // State Sidebar & Modals
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGoogleLoginOpen, setIsGoogleLoginOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
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
  }, [theme]);

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
        const response = await getHistory(conversationId, 1, pagination.perPage);
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
  }, [conversationId]);

  // Fungsi untuk load more messages
  const loadMoreMessages = useCallback(async () => {
    if (pagination.isLoadingMore || !pagination.hasMore) return;

    try {
      setPagination((prev) => ({ ...prev, isLoadingMore: true }));
      const nextPage = pagination.page + 1;
      const response = await getHistory(
        conversationId,
        nextPage,
        pagination.perPage
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

  const handleSendMessage = async (prompt) => {
    if (isLoading) return;

    // Cek batasan percakapan tamu (maksimal 2x percakapan)
    if (!user && isGuestLimitReached) {
      setIsGoogleLoginOpen(true);
      setAlert({
        show: true,
        message: "Batas 2x percakapan untuk tamu telah tercapai. Silakan masuk via Google untuk menikmati chat tanpa batas (Unlimited)!",
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
        (chunk) => {
          try {
            const lines = chunk.split("\n");
            lines.forEach((line) => {
              if (line.startsWith("data: ")) {
                const jsonStr = line.substring(6);
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
                    const textChunk = data.text;
                    aiResponseAccumulator.current += textChunk;
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
                "Batas 2x percakapan tamu telah tercapai. Silakan masuk via Google untuk akses unlimited.",
              type: "error",
            });
          }
          aiResponseAccumulator.current = `Terjadi kesalahan: ${error.message}`;
          updateLastAiMessage();
          setThinkingStatus({ isThinking: false, status: "", detail: "" });
        },
        abortControllerRef.current.signal
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
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setThinkingStatus({ isThinking: false, status: "", detail: "" });
      setMessages((prev) =>
        prev.filter((msg) => !(msg.sender === "ai" && msg.text === ""))
      );
    }
  };

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    navigate(`/chat/${newId}`);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (targetConvId) => {
    try {
      await deleteConversationApi(targetConvId, user?.id);
      setConversations((prev) =>
        prev.filter((c) => c.conversation_id !== targetConvId)
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
          prev.map((c) => (c.conversation_id === targetConvId ? { ...c, title: newTitle } : c))
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
      prev.map((c) => (c.conversation_id === targetConvId ? { ...c, is_pinned: isPinned } : c))
    );
    try {
      await togglePinConversationApi(targetConvId, isPinned, user?.id);
    } catch (err) {
      console.error("Gagal menyematkan percakapan:", err);
      setConversations((prev) =>
        prev.map((c) => (c.conversation_id === targetConvId ? { ...c, is_pinned: !isPinned } : c))
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
          msg.id === messageId ? { ...msg, feedbackGiven: type } : msg
        )
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
    <div className="bg-gray-50 dark:bg-gray-900 font-inter transition-colors duration-300">
      {alert.show && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg text-white transition-opacity duration-300 ${
            alert.type === "success" ? "bg-green-600" : "bg-red-600"
          } ${alert.show ? "opacity-100" : "opacity-0"}`}
        >
          {alert.message}
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={conversationId}
          onSelectConversation={(id) => {
            navigate(`/chat/${id}`);
            if (window.innerWidth < 768) {
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
            if (window.innerWidth < 768) {
              setSidebarOpen(false);
            }
          }}
          onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
        />

        {/* Main Section */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onThemeToggle={handleToggleTheme}
            theme={theme}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenGoogleLogin={() => setIsGoogleLoginOpen(true)}
            onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              thinkingStatus={thinkingStatus}
              onFeedback={openFeedbackModal}
              onLoadMore={loadMoreMessages}
              pagination={pagination}
            />
            <ChatInput
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