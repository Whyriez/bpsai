// src/services/chatApi.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Autentikasi Google User ke backend Flask.
 */
export const googleAuthApi = async (googlePayload) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(googlePayload),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ msg: "Gagal autentikasi Google" }));
    throw new Error(errorData.msg || "Gagal autentikasi Google");
  }

  return response.json();
};

/**
 * Memperbarui (refresh) access token JWT menggunakan refresh token.
 */
export const refreshAccessTokenApi = async (refreshToken) => {
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ msg: "Sesi kedaluwarsa, silakan login kembali" }));
    throw new Error(errorData.msg || "Gagal memperbarui sesi token");
  }

  return response.json();
};

/**
 * Menghapus akun pengguna dari database.
 */
export const deleteAccountApi = async (userId, token = null) => {
  if (!userId) return false;
  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Gagal menghapus akun" }));
      throw new Error(errorData.error || "Gagal menghapus akun");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

/**
 * Mengambil daftar percakapan pengguna (untuk user terautentikasi).
 */
export const getUserConversations = async (userId) => {
  if (!userId) return [];
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations?user_id=${userId}`,
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    return [];
  }
};

/**
 * Mengubah nama (rename) judul percakapan.
 */
export const renameConversationApi = async (
  conversationId,
  newTitle,
  userId,
) => {
  if (!conversationId || !newTitle) return false;
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTitle,
          user_id: userId,
        }),
      },
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error renaming conversation:", error);
    return false;
  }
};

/**
 * Menyematkan (pin) atau melepas pin (unpin) percakapan.
 */
export const togglePinConversationApi = async (
  conversationId,
  isPinned,
  userId,
) => {
  if (!conversationId) return false;
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/pin`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_pinned: isPinned,
          user_id: userId,
        }),
      },
    );
    if (!response.ok) return false;
    return await response.json();
  } catch (error) {
    console.error("Error toggling pin conversation:", error);
    return false;
  }
};

/**
 * Menghapus riwayat percakapan spesifik pengguna.
 */
export const deleteUserConversation = async (conversationId, userId) => {
  if (!conversationId) return false;
  try {
    const url = userId
      ? `${API_BASE_URL}/conversations/${conversationId}?user_id=${userId}`
      : `${API_BASE_URL}/conversations/${conversationId}`;
    const response = await fetch(url, {
      method: "DELETE",
    });
    return response.ok;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
};

export const deleteConversationApi = deleteUserConversation;

/**
 * Mengambil riwayat obrolan dari backend berdasarkan conversationId.
 */
export const getHistory = async (conversationId, page = 1, perPage = 20) => {
  if (!conversationId)
    return {
      messages: [],
      pagination: { page: 1, per_page: perPage, total: 0, has_more: false },
    };
  try {
    const response = await fetch(
      `${API_BASE_URL}/chat/history/${conversationId}?page=${page}&per_page=${perPage}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal mengambil riwayat chat:", error);
    return {
      messages: [],
      pagination: { page: 1, per_page: perPage, total: 0, has_more: false },
    };
  }
};

export const fetchChatHistory = getHistory;

/**
 * Mengirim pesan ke backend dan menangani respons secara streaming.
 */
export const streamChat = async (
  promptOrOptions,
  sessionIdOrOnChunk,
  onChunkOrOnError,
  onErrorOrSignal,
  signalParam,
  userIdParam = null,
) => {
  let prompt, sessionId, onChunk, onError, signal, userId;

  if (typeof promptOrOptions === "object" && promptOrOptions !== null) {
    prompt = promptOrOptions.prompt;
    sessionId =
      promptOrOptions.conversation_id ||
      promptOrOptions.session_id ||
      promptOrOptions.sessionId;
    userId = promptOrOptions.user_id || promptOrOptions.userId || null;
    onChunk = sessionIdOrOnChunk;
    onError = onChunkOrOnError;
    signal = onErrorOrSignal;
  } else {
    prompt = promptOrOptions;
    sessionId = sessionIdOrOnChunk;
    onChunk = onChunkOrOnError;
    onError = onErrorOrSignal;
    signal = signalParam;
    userId = userIdParam;
  }

  try {
    const bodyPayload = {
      prompt: prompt,
      conversation_id: sessionId,
      session_id: sessionId,
    };
    if (userId) {
      bodyPayload.user_id = userId;
    }

    const headers = {
      "Content-Type": "application/json",
    };
    const savedToken = localStorage.getItem("sigap_token");
    if (savedToken) {
      headers["Authorization"] = `Bearer ${savedToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`,
        }));
      const message =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message ||
            errorData.msg ||
            `Server error: ${response.status} ${response.statusText}`;
      const err = new Error(message);
      if (errorData.error?.code) {
        err.code = errorData.error.code;
      }
      throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      // Simpan potongan baris terakhir yang belum lengkap di buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.substring(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonStr);
          if (onChunk) onChunk(data);
        } catch (e) {
          console.warn("Error parsing SSE line:", line, e);
        }
      }
    }

    // Flush sisa buffer jika ada
    if (buffer.trim().startsWith("data: ")) {
      const jsonStr = buffer.trim().substring(6).trim();
      if (jsonStr && jsonStr !== "[DONE]") {
        try {
          const data = JSON.parse(jsonStr);
          if (onChunk) onChunk(data);
        } catch (e) {
          // ignore incomplete end
        }
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Streaming error:", error);
      if (onError) onError(error);
    }
  }
};

export const streamChatMessage = streamChat;

/**
 * Mengirim feedback pengguna ke server.
 */
export const submitFeedback = async (feedbackData) => {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(feedbackData),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Failed to send feedback" }));
    throw new Error(errorData.error);
  }

  return response.json();
};

/**
 * Mengirim data tabel Markdown dan menerima file Excel sebagai blob.
 */
export const exportToExcel = async (markdownTable, title) => {
  try {
    const response = await fetch(`${API_BASE_URL}/export/excel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        markdown_table: markdownTable,
        title: title,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Gagal membuat file Excel");
    }

    return await response.blob();
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw error;
  }
};
