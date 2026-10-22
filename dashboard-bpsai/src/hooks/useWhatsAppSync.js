import { useCallback, useEffect, useRef } from "react";
import apiFetch from "../services/api";

const BASE = "/documents/bps/whatsapp-explorer";

// The gateway returns full history. Retain messages already displayed while an
// older snapshot is in flight, and let the server update matching message IDs.
export function mergeMessages(previous = [], incoming = []) {
  const messages = new Map();
  for (const message of [...previous, ...incoming]) {
    if (!message.id?.startsWith("meta-")) messages.set(message.id, message);
  }
  return messages.size
    ? [...messages.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    : incoming;
}

export default function useWhatsAppSync(context) {
  const latest = useRef(context);
  const requests = useRef({ chats: null, detail: null });
  const account = useRef(null);
  const errors = useRef({ chats: null, detail: null });
  useEffect(() => { latest.current = context; });

  const runRequest = useCallback((key, chatId, silent) => {
    const ctx = latest.current;
    if (ctx.sourceMode !== "live" || (key === "detail" && (!chatId || chatId !== ctx.activeChatId))) return Promise.resolve(false);
    const current = requests.current[key];
    if (current && current.chatId === chatId) return current.promise;
    current?.controller.abort();
    const controller = new AbortController();
    const request = { controller, chatId, promise: null };
    requests.current[key] = request;
    const timeout = setTimeout(() => controller.abort(), 12000);
    const isCurrent = () => !controller.signal.aborted &&
      requests.current[key] === request && latest.current.sourceMode === "live" &&
      (key !== "detail" || latest.current.activeChatId === chatId);
    if (!silent) {
      if (key === "chats") ctx.setIsLoadingChats(true);
      else ctx.setIsLoadingDetail(true);
    }

    request.promise = (async () => {
      try {
        const url = `${BASE}/chats${key === "detail" ? `/${encodeURIComponent(chatId)}` : ""}?_t=${Date.now()}`;
        const res = await apiFetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!isCurrent()) return false;
        const state = latest.current;
        if (res?.success === false || !res) throw new Error(res?.error || "Respons gateway tidak valid");
        if (key === "chats") {
          const connected = Boolean(res.is_connected);
          state.setWaConnectionStatus((prev) => ({
            ...prev,
            is_connected: connected,
            status: res.status || (connected ? "CONNECTED" : "DISCONNECTED"),
            phone: res.phone || prev.phone,
            phone_formatted: res.phone_formatted || prev.phone_formatted,
          }));
          // A temporary reconnect must not empty the list or close the conversation.
          if (!connected) return false;
          if (!Array.isArray(res.chats)) throw new Error("Daftar obrolan tidak valid");
          const changedAccount = account.current && res.phone && account.current !== res.phone;
          if (res.phone) account.current = res.phone;
          if (changedAccount) {
            requests.current.detail?.controller.abort();
            requests.current.detail = null;
            state.setActiveChatId(null);
            state.setActiveChatDetail(null);
            state.setNewIncomingChatIds(new Set());
            state.setIsLoadingDetail(false);
          }
          const previous = changedAccount ? [] : state.chats;
          const incomingIds = [];
          if (silent && previous.length) {
            const byId = new Map(previous.map((chat) => [chat.id, chat]));
            for (const chat of res.chats) {
              const old = byId.get(chat.id);
              if (chat.last_message && !chat.last_message.fromMe && chat.id !== state.activeChatId &&
                  (!old || chat.last_message.timestamp > (old.last_message?.timestamp || 0))) {
                incomingIds.push(chat.id);
              }
            }
            if (incomingIds.length) {
              const chat = res.chats.find((item) => item.id === incomingIds[0]);
              state.notify(chat.name, chat.last_message.text, false);
              state.setNewIncomingChatIds((prev) => new Set([...prev, ...incomingIds]));
            }
          }
          state.setChats((prev) => {
            if (changedAccount) return res.chats;
            const byId = new Map(prev.map((chat) => [chat.id, chat]));
            const merged = res.chats.map((chat) => {
              const old = byId.get(chat.id);
              byId.delete(chat.id);
              return old && ((old.last_message?.timestamp || 0) > (chat.last_message?.timestamp || 0) ||
                ((old.last_message?.timestamp || 0) === (chat.last_message?.timestamp || 0) && old.message_count > chat.message_count))
                ? { ...chat, last_message: old.last_message, message_count: old.message_count }
                : chat;
            });
            // Preserve local new chats and temporarily missing gateway entries.
            merged.push(...byId.values());
            merged.sort((a, b) => (b.last_message?.timestamp || 0) - (a.last_message?.timestamp || 0));
            return JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged;
          });
          state.setStats(res.stats || null);
          if (!state.activeChatId && !changedAccount && res.chats.length && window.innerWidth >= 768) {
            state.setActiveChatId(res.chats[0].id);
          }
        } else {
          if (!res.chat) throw new Error(res.error || "Gagal mengambil pesan obrolan");
          const previous = state.activeChatDetail;
          const isSameChat = Boolean(
            previous && (
              previous.id === res.chat.id ||
              previous.id === chatId ||
              (previous.lid && (previous.lid === chatId || previous.lid === res.chat.lid)) ||
              (res.chat.lid && (res.chat.lid === chatId || res.chat.lid === previous.id)) ||
              res.chat.id === chatId
            )
          );
          if (silent && previous && isSameChat) {
            const ids = new Set((previous.messages || []).map((message) => message.id));
            const incoming = (res.chat.messages || []).filter((message) => !ids.has(message.id) &&
              !message.fromMe && !message.id?.startsWith("meta-"));
            if (incoming.length) state.notify(res.chat.name, incoming.at(-1).text, true);
          }
          state.setActiveChatDetail((prev) => {
            const isMatch = Boolean(
              prev && (
                prev.id === res.chat.id ||
                prev.id === chatId ||
                (prev.lid && (prev.lid === chatId || prev.lid === res.chat.lid)) ||
                (res.chat.lid && (res.chat.lid === chatId || res.chat.lid === prev.id)) ||
                res.chat.id === chatId
              )
            );
            const messages = isMatch
              ? mergeMessages(prev.messages, res.chat.messages) : res.chat.messages || [];
            const next = { ...res.chat, messages,
              total_messages: Math.max(res.chat.total_messages || 0, messages.filter((m) => !m.id?.startsWith("meta-")).length) };
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
          const last = res.chat.messages?.filter((m) => !m.id?.startsWith("meta-")).at(-1);
          if (last) state.setChats((prev) => prev.map((chat) => {
            const isMatch = chat.id === chatId || chat.id === res.chat.id ||
              (chat.lid && (chat.lid === chatId || chat.lid === res.chat.lid));
            if (!isMatch) return chat;
            if ((chat.last_message?.timestamp || 0) > (last.timestamp || 0) || chat.message_count > res.chat.total_messages) return chat;
            return { ...chat, message_count: res.chat.total_messages ?? res.chat.messages.length,
              last_message: { text: last.text || `[${last.type}]`, type: last.type, timestamp: last.timestamp, fromMe: last.fromMe },
              session_status: res.chat.session_status || chat.session_status };
          }));
          if (!silent && res.chat.is_direct) state.setRightPanelTab((tab) =>
            tab === "media" || tab === "links" ? tab : "pst");
        }
        state.setLastSyncTime(new Date());
        errors.current[key] = null;
        state.setSyncError(errors.current.chats || errors.current.detail);
        return true;
      } catch (error) {
        if (isCurrent() || (controller.signal.aborted && requests.current[key] === request)) {
          errors.current[key] = controller.signal.aborted ? "Gateway lambat merespons. Mencoba kembali…" : error.message;
          latest.current.setSyncError(errors.current.chats || errors.current.detail);
        }
        return false;
      } finally {
        clearTimeout(timeout);
        if (requests.current[key] === request) {
          requests.current[key] = null;
          if (key === "chats") latest.current.setIsLoadingChats(false);
          else latest.current.setIsLoadingDetail(false);
        }
      }
    })();
    return request.promise;
  }, []);

  const fetchLiveChats = useCallback((silent = false) => runRequest("chats", null, silent), [runRequest]);
  const fetchLiveChatDetail = useCallback((chatId, silent = false) => runRequest("detail", chatId, silent), [runRequest]);

  useEffect(() => {
    const state = latest.current;
    const pending = requests.current;
    state.setChats([]);
    state.setStats(null);
    state.setActiveChatId(null);
    state.setActiveChatDetail(null);
    state.setNewIncomingChatIds(new Set());
    state.setSyncError(null);
    errors.current = { chats: null, detail: null };
    state.setLastSyncTime(null);
    state.setIsLoadingChats(false);
    state.setIsLoadingDetail(false);
    account.current = null;
    if (context.sourceMode !== "live") return;
    fetchLiveChats();
    const timer = setInterval(() => fetchLiveChats(true), 3500);
    const onFocus = () => {
      if (document.hidden) return;
      fetchLiveChats(true);
      fetchLiveChatDetail(latest.current.activeChatId, true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      for (const key of ["chats", "detail"]) {
        pending[key]?.controller.abort();
        pending[key] = null;
      }
    };
  }, [context.sourceMode, fetchLiveChats, fetchLiveChatDetail]);

  useEffect(() => {
    if (context.sourceMode !== "live" || !context.activeChatId) return;
    const pending = requests.current;
    fetchLiveChatDetail(context.activeChatId);
    const timer = setInterval(() => fetchLiveChatDetail(latest.current.activeChatId, true), 1000);
    return () => {
      clearInterval(timer);
      pending.detail?.controller.abort();
      pending.detail = null;
    };
  }, [context.sourceMode, context.activeChatId, fetchLiveChatDetail]);

  return { fetchLiveChats, fetchLiveChatDetail };
}
