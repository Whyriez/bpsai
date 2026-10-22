import express from 'express';
import messageStore from '../store/messageStore.js';
import liveChatSessionService from '../services/liveChatSessionService.js';
import { fetchParticipatingGroups, fetchGroupMetadata } from '../services/whatsappMetadataCache.js';

const router = express.Router();

// Middleware anti-cache: pastikan respons selalu fresh untuk live chat realtime
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

let _getSock = () => null;
let _getIsConnected = () => false;
let _getNewsletters = null;
let _cacheOutgoingMessage = null;

/**
 * Configure socket getters from server.js
 */
export function setExplorerSocketGetter(getSock, getIsConnected, getNewsletters, cacheOutgoingMessage) {
  _getSock = getSock;
  _getIsConnected = getIsConnected;
  if (getNewsletters) _getNewsletters = getNewsletters;
  if (cacheOutgoingMessage) _cacheOutgoingMessage = cacheOutgoingMessage;
}

/**
 * Helper to format target JID
 */
function formatTargetJid(target) {
  let cleaned = String(target || '').trim();
  if (!cleaned) return null;

  // 1. Jika target adalah LID (@lid), SELALU resolve ke nomor telepon asli (@s.whatsapp.net) jika diketahui
  if (cleaned.endsWith('@lid')) {
    const resolved = messageStore.resolveLidToPhone(cleaned);
    if (resolved && resolved.endsWith('@s.whatsapp.net')) {
      console.log(`🎯 [formatTargetJid] Mengubah target LID ${cleaned} -> nomor telepon ${resolved}`);
      return resolved;
    }
    // Jika belum terpetakan ke nomor telepon, tetap pertahankan format @lid asli
    return cleaned;
  }

  // 2. Format resmi WhatsApp (@g.us, @s.whatsapp.net, @newsletter, @lid)
  if (
    cleaned.endsWith('@g.us') ||
    cleaned.endsWith('@s.whatsapp.net') ||
    cleaned.endsWith('@newsletter') ||
    cleaned.endsWith('@lid')
  ) {
    return cleaned;
  }

  // 3. Format nomor HP standar atau digit LID tanpa sufiks
  cleaned = cleaned.replace(/[^\d]/g, '');
  if (!cleaned) return null;

  // Cek apakah angka ini merupakan LID yang tersimpan
  const resolvedFromLid = messageStore.resolveLidToPhone(`${cleaned}@lid`);
  if (resolvedFromLid && resolvedFromLid.endsWith('@s.whatsapp.net')) {
    console.log(`🎯 [formatTargetJid] Mengubah digit LID ${cleaned} -> nomor telepon ${resolvedFromLid}`);
    return resolvedFromLid;
  }

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return `${cleaned}@s.whatsapp.net`;
}

// GET /whatsapp/explorer/chats — get all stored chat summaries merged with live groups & channels
router.get('/chats', async (req, res) => {
  try {
    const sock = _getSock();
    const isConn = _getIsConnected();
    const rawPhone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
    const isActuallyConnected = Boolean(isConn && rawPhone);

    // Jika bot sedang terputus / logout, kembalikan daftar kosong agar tidak membocorkan riwayat nomor lama
    if (!isActuallyConnected) {
      return res.json({
        success: true,
        is_connected: false,
        status: 'DISCONNECTED',
        phone: null,
        phone_formatted: null,
        total: 0,
        stats: {
          total_chats: 0,
          total_messages: 0,
          total_contacts: 0,
          total_groups: 0,
          total_channels: 0,
          total_direct: 0,
        },
        chats: [],
        message: 'WhatsApp belum terhubung atau sesi telah keluar.',
      });
    }

    const summaries = messageStore.getChatSummaries();
    const existingIds = new Set(summaries.map(s => s.id));

    // If socket is connected, merge participating groups & channels
    if (sock && isConn) {
      // 1. Fetch participating groups from WhatsApp Baileys
      try {
        const rawGroups = await fetchParticipatingGroups(sock);
        for (const [id, g] of Object.entries(rawGroups)) {
          if (!existingIds.has(id)) {
            const participants = g.participants || [];
            const isAnnounce = Boolean(g.isCommunityAnnounce || g.announce);
            const isComm = Boolean(g.isCommunity);
            const type = isAnnounce ? 'channel' : (isComm ? 'community' : 'group');
            summaries.push({
              id: id,
              name: g.subject || 'Grup WhatsApp',
              type: type,
              is_group: !isAnnounce,
              is_channel: isAnnounce,
              is_direct: false,
              participant_count: participants.length,
              message_count: 0,
              media_count: 0,
              link_count: 0,
              last_message: {
                text: g.desc ? g.desc.toString() : 'Grup WhatsApp aktif',
                type: 'text',
                timestamp: g.creation || null,
                fromMe: false,
                sender: null,
              }
            });
            existingIds.add(id);
          }
        }
      } catch (grpErr) {
        console.warn('Catatan explorer groups:', grpErr.message);
      }

      // 2. Fetch subscribed newsletters (Saluran Resmi WhatsApp)
      try {
        if (_getNewsletters) {
          const newsletters = await _getNewsletters(sock);
          for (const ch of newsletters) {
            if (!existingIds.has(ch.id)) {
              summaries.push({
                id: ch.id,
                name: ch.name || 'Saluran WhatsApp',
                type: 'channel',
                is_group: false,
                is_channel: true,
                is_direct: false,
                participant_count: ch.member_count || 0,
                message_count: 0,
                media_count: 0,
                link_count: 0,
                last_message: {
                  text: ch.desc || 'Saluran Resmi WhatsApp',
                  type: 'text',
                  timestamp: null,
                  fromMe: false,
                  sender: null,
                }
              });
              existingIds.add(ch.id);
            }
          }
        }
      } catch (nlErr) {
        console.warn('Catatan explorer newsletters:', nlErr.message);
      }
    }

    // Sort: chats with messages first (newest timestamp), then alphabetical
    summaries.sort((a, b) => {
      const tsA = a.last_message?.timestamp || 0;
      const tsB = b.last_message?.timestamp || 0;
      if (tsA && tsB) return tsB - tsA;
      if (tsA) return -1;
      if (tsB) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Enrich direct chats with session data (waiting_admin, admin_active, delayed, closed)
    for (const s of summaries) {
      if (s.is_direct) {
        const session = liveChatSessionService.getSession(s.id);
        s.session_status = session?.status || 'waiting_admin';
        s.flag_3days = Boolean(session?.flag_3days || session?.delayed_3days || session?.status === 'delayed');
        s.delayed_3days = s.flag_3days;
        s.delayed_at = session?.delayedAt || null;
        s.delayed_until = session?.delayedUntil || null;
        s.delayed_until_formatted = session?.delayedUntilFormatted || null;
        s.delayed_topic = session?.delayedTopic || session?.consultationTopic || null;
        s.delayed_by = session?.delayedBy || null;
        s.delayed_note = session?.delayedNote || null;
        s.reached_out_at = session?.reachedOutAt || null;
        s.reached_out_by = session?.reachedOutBy || null;
        s.customer_replied_after_flag = Boolean(session?.customerRepliedAfterFlag);
        s.auto_greeted = Boolean(session?.autoGreeted);
        s.auto_greeted_at = session?.autoGreetedAt || null;
        s.visitor_data = session?.visitorData || null;
        s.termination_type = session?.terminationType || null;
        s.consultation_topic = session?.consultationTopic || null;
        s.closed_at = session?.closedAt || null;
        s.ai_intent = session?.aiIntent || null;
        s.ai_topic = session?.aiTopic || null;
        s.ai_suggested_reply = session?.aiSuggestedReply || null;
        s.ai_analyzed_at = session?.aiAnalyzedAt || null;
        s.has_admin_replied_today = liveChatSessionService.hasAdminRepliedToday(s.id, session);
      } else {
        s.session_status = 'group';
        s.delayed_3days = false;
      }
    }

    const stats = messageStore.getMessageStats();
    res.json({
      success: true,
      is_connected: true,
      status: 'CONNECTED',
      phone: rawPhone,
      phone_formatted: messageStore.formatPhoneNumber(rawPhone),
      total: summaries.length,
      stats: {
        ...stats,
        total_chats: summaries.length,
        total_groups: summaries.filter(s => s.is_group).length,
        total_channels: summaries.filter(s => s.is_channel).length,
        total_direct: summaries.filter(s => s.is_direct).length,
      },
      chats: summaries,
    });
  } catch (err) {
    console.error('❌ [Explorer] Error getting chats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/chats/:chatId — get messages & media for a specific chat
router.get('/chats/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Chat ID diperlukan' });
    }
    const sock = _getSock();
    const isConn = _getIsConnected();
    const rawPhone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
    const isActuallyConnected = Boolean(isConn && rawPhone);

    if (!isActuallyConnected) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp belum terhubung atau sesi telah keluar.',
      });
    }

    let detail = messageStore.getChatDetail(chatId);

    // If it's a group, enrich with live WhatsApp group metadata if available
    if (chatId.endsWith('@g.us') && sock && isConn) {
      try {
        const meta = await fetchGroupMetadata(sock, chatId);
        if (meta) {
          detail.name = meta.subject || detail.name;
          detail.participant_count = meta.participants?.length || 0;
          if (!detail.participants || detail.participants.length === 0) {
            detail.participants = (meta.participants || []).map(p => {
              const pId = p.id || String(p);
              const pPhone = messageStore.formatPhoneNumber(pId);
              return {
                jid: pId,
                phone: pPhone,
                raw_phone: pId.split('@')[0],
                name: pPhone,
                admin: p.admin || null,
                message_count: 0
              };
            });
          }
          if (detail.messages.length === 0) {
            detail.messages = [
              {
                id: 'meta-group-info',
                fromMe: false,
                text: meta.desc
                  ? `Deskripsi Grup:\n${meta.desc.toString()}`
                  : `Grup WhatsApp "${meta.subject}" aktif dengan ${meta.participants?.length || 0} anggota. Anda dapat mengirim rilis BPS atau pesan teks ke grup ini melalui kolom di bawah.`,
                type: 'text',
                timestamp: meta.creation || Math.floor(Date.now() / 1000),
                pushName: 'Sistem WhatsApp',
              }
            ];
          }
        }
      } catch (grpErr) {
        console.warn('Catatan groupMetadata:', grpErr.message);
      }
    }

    // Enrich detail with live session data
    const session = liveChatSessionService.getSession(chatId);
    detail.session = session || null;
    detail.session_status = session?.status || (detail.is_direct ? 'waiting_admin' : 'group');
    detail.flag_3days = Boolean(session?.flag_3days || session?.delayed_3days || session?.status === 'delayed');
    detail.delayed_3days = detail.flag_3days;
    detail.delayed_at = session?.delayedAt || null;
    detail.delayed_until = session?.delayedUntil || null;
    detail.delayed_until_formatted = session?.delayedUntilFormatted || null;
    detail.delayed_topic = session?.delayedTopic || session?.consultationTopic || null;
    detail.delayed_by = session?.delayedBy || null;
    detail.delayed_note = session?.delayedNote || null;
    detail.reached_out_at = session?.reachedOutAt || null;
    detail.reached_out_by = session?.reachedOutBy || null;
    detail.customer_replied_after_flag = Boolean(session?.customerRepliedAfterFlag);
    detail.visitor_data = session?.visitorData || null;
    detail.ai_analysis = session?.aiAnalysis || null;
    detail.ai_intent = session?.aiIntent || null;
    detail.ai_topic = session?.aiTopic || null;
    detail.ai_suggested_reply = session?.aiSuggestedReply || null;
    detail.ai_analyzed_at = session?.aiAnalyzedAt || null;
    detail.has_admin_replied_today = liveChatSessionService.hasAdminRepliedToday(chatId, session);

    res.json({
      success: true,
      chat: detail,
    });
  } catch (err) {
    console.error(`❌ [Explorer] Error getting chat ${req.params.chatId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/backups — list available backup ZIP files
router.get('/backups', (req, res) => {
  try {
    const backups = messageStore.listBackupZips();
    res.json({
      success: true,
      total: backups.length,
      backups,
    });
  } catch (err) {
    console.error('❌ [Explorer] Error listing backups:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/backups/inspect?filename=...
router.get('/backups/inspect', async (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Nama berkas backup diperlukan' });
    }
    const data = await messageStore.inspectBackupZip(filename);
    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error(`❌ [Explorer] Error inspecting backup ${req.query.filename}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/backups/chat?filename=...&chatId=...
router.get('/backups/chat', async (req, res) => {
  try {
    const { filename, chatId } = req.query;
    if (!filename || !chatId) {
      return res.status(400).json({ success: false, error: 'Parameter filename dan chatId diperlukan' });
    }
    const chatDetail = await messageStore.getBackupZipChat(filename, chatId);
    res.json({
      success: true,
      chat: chatDetail,
    });
  } catch (err) {
    console.error('❌ [Explorer] Error getting backup chat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/reply — send reply message directly from SIGAP
router.post('/reply', async (req, res) => {
  try {
    const { target, message, quotedMsgId, quotedParticipant, quotedText, quotedSender, quotedFromMe } = req.body;
    if (!target || !message) {
      return res.status(400).json({ success: false, error: 'Target dan pesan balasan wajib diisi' });
    }

    const isConnected = _getIsConnected();
    const sock = _getSock();

    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Gateway belum terhubung. Silakan hubungkan gateway terlebih dahulu untuk mengirim balasan.',
      });
    }

    const jid = formatTargetJid(target);
    if (!jid) {
      return res.status(400).json({ success: false, error: 'Format nomor atau grup target tidak valid' });
    }

    console.log(`💬 [Explorer] Mengirim balasan ke ${jid}: "${message.slice(0, 50)}..."${quotedMsgId ? ` (Membalas ${quotedMsgId})` : ''}`);
    
    // Prepare Baileys send options for quoting
    const sendOptions = {};
    if (quotedMsgId) {
      sendOptions.quoted = {
        key: {
          remoteJid: jid,
          id: quotedMsgId,
          participant: quotedParticipant || undefined,
          fromMe: Boolean(quotedFromMe),
        },
        message: {
          conversation: quotedText || '',
        },
      };
    }

    const sent = await sock.sendMessage(jid, { text: message }, sendOptions);
    if (sent?.key?.id && sent?.message && _cacheOutgoingMessage) {
      _cacheOutgoingMessage(sent.key.id, sent.message);
    }

    // Store the outgoing message locally in messageStore as well
    const outgoingMsg = {
      key: {
        id: sent?.key?.id || `out-${Date.now()}`,
        remoteJid: jid,
        fromMe: true,
      },
      message: quotedMsgId
        ? {
            extendedTextMessage: {
              text: message,
              contextInfo: {
                stanzaId: quotedMsgId,
                participant: quotedParticipant || undefined,
                quotedMessage: {
                  conversation: quotedText || '',
                },
              },
            },
          }
        : {
            conversation: message,
          },
      rawMessage: sent?.message || undefined,
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'SIGAP BPS Admin',
    };
    messageStore.saveMessages(jid, [outgoingMsg]);
    liveChatSessionService.handleAdminMessageSent(jid, 'SIGAP BPS Admin', sent?.key?.id, message);

    res.json({
      success: true,
      message: 'Pesan balasan berhasil dikirim melalui WhatsApp Gateway',
      message_id: sent?.key?.id,
      timestamp: Math.floor(Date.now() / 1000),
      quoted: quotedMsgId
        ? {
            id: quotedMsgId,
            participant: quotedParticipant || null,
            text: quotedText || '',
            sender: quotedSender || null,
          }
        : null,
    });
  } catch (err) {
    console.error('❌ [Explorer] Error sending reply:', err);
    res.status(500).json({ success: false, error: `Gagal mengirim balasan: ${err.message}` });
  }
});

// ===================================================================
// LIVE CHAT SESSIONS & TERMINATION ENDPOINTS
// ===================================================================

// GET /whatsapp/explorer/sessions — get all active & past live chat sessions
router.get('/sessions', (req, res) => {
  try {
    const all = liveChatSessionService.getAllSessions();
    const settings = liveChatSessionService.getLiveSettings();
    res.json({
      success: true,
      sessions: all,
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/sessions/:chatId — get single session details
router.get('/sessions/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const session = liveChatSessionService.getSession(chatId);
    const settings = liveChatSessionService.getLiveSettings();
    res.json({
      success: true,
      session: session || null,
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/sessions/:chatId/takeover — admin takes over chat
router.post('/sessions/:chatId/takeover', (req, res) => {
  try {
    const { chatId } = req.params;
    const { adminName = 'Admin PST' } = req.body || {};
    const session = liveChatSessionService.takeoverSession(chatId, adminName);
    res.json({
      success: true,
      message: 'Sesi obrolan berhasil diambil alih oleh admin',
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/sessions/:chatId/delay — mark session as delayed (maks. 3 hari kerja)
router.post('/sessions/:chatId/delay', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { adminName = 'Admin PST', topic = '', note = '', sendMessage = true } = req.body || {};
    const session = liveChatSessionService.delaySession(chatId, { adminName, topic, note });

    if (sendMessage) {
      const sock = _getSock();
      const isConn = _getIsConnected();
      if (sock && isConn) {
        const jid = formatTargetJid(chatId);
        const delayMsg = liveChatSessionService.buildDelayMessage();
        await sock.sendMessage(jid, { text: delayMsg });
        const outMsg = {
          key: { id: `delay-${Date.now()}`, remoteJid: jid, fromMe: true },
          message: { conversation: delayMsg },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: `${adminName} (Penundaan Data)`
        };
        messageStore.saveMessages(jid, [outMsg]);
      }
    }

    res.json({
      success: true,
      message: 'Status sesi diperbarui ke Penundaan Pengolahan Data (Maks. 3 Hari)',
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/sessions/:chatId/reopen — reopen closed session
router.post('/sessions/:chatId/reopen', (req, res) => {
  try {
    const { chatId } = req.params;
    const session = liveChatSessionService.reopenSession(chatId);
    res.json({
      success: true,
      message: 'Sesi berhasil dibuka kembali',
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/sessions/:chatId/terminate — official session termination conforming to PDF
router.post('/sessions/:chatId/terminate', async (req, res) => {
  try {
    const { chatId } = req.params;
    const {
      type = 'completed', // 'completed' | 'end_of_day' | 'midday_1400' | 'delayed_3days'
      topic = '',
      nextSchedule = '',
      message = '',
      adminName = 'Admin PST',
      sendWhatsappMessage = true,
      note = ''
    } = req.body || {};

    const sock = _getSock();
    const isConnected = _getIsConnected();

    if (sendWhatsappMessage && (!sock || !isConnected)) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Gateway belum terhubung. Tidak dapat mengirim pesan terminasi ke pelanggan.'
      });
    }

    const jid = formatTargetJid(chatId);
    const sendFn = async (targetJid, text) => {
      return await sock.sendMessage(targetJid, { text });
    };

    const result = await liveChatSessionService.terminateSession(
      jid,
      { type, topic, nextSchedule, message, adminName, sendWhatsappMessage, note },
      sendFn
    );

    let resMsg = 'Sesi konsultasi berhasil diterminasi dan survei SKD dikirim';
    if (type === 'end_of_day') {
      resMsg = 'Sesi berhasil diterminasi (Jam Layanan Berakhir)';
    } else if (type === 'midday_1400') {
      resMsg = 'Sesi 14.00 WITA berhasil diterminasi & survei SKD dikirim';
    } else if (type === 'delayed_3days' || type === 'delayed') {
      resMsg = 'Flag Terminasi 3 Hari berhasil diaktifkan. Auto-pembuka dan penutup dinonaktifkan agar kontak dapat direach-out kembali.';
    }

    res.json({
      success: true,
      message: resMsg,
      result
    });
  } catch (err) {
    console.error('❌ [Explorer] Error terminating session:', err);
    res.status(500).json({ success: false, error: `Gagal terminasi sesi: ${err.message}` });
  }
});

// POST /whatsapp/explorer/sessions/:chatId/ai-analysis — simpan hasil analisis intent AI
router.post('/sessions/:chatId/ai-analysis', (req, res) => {
  try {
    const { chatId } = req.params;
    const body = req.body || {};
    const updated = liveChatSessionService.saveAiAnalysis(chatId, body);
    res.json({ success: true, session: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/sessions-settings
router.get('/sessions-settings', (req, res) => {
  try {
    res.json({
      success: true,
      settings: liveChatSessionService.getLiveSettings()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /whatsapp/explorer/sessions-settings
router.post('/sessions-settings', (req, res) => {
  try {
    const updated = liveChatSessionService.updateLiveSettings(req.body || {});
    res.json({
      success: true,
      message: 'Pengaturan Live Chat & Jam Operasional berhasil disimpan',
      settings: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /whatsapp/explorer/templates — get all official PST BPS templates from uploaded guide
router.get('/templates', (req, res) => {
  try {
    const topic = req.query.topic || 'konsultasi data';
    const schedule = req.query.schedule || null;
    res.json({
      success: true,
      templates: [
        {
          id: 'opening',
          title: 'Pesan Pembuka (Jam Layanan)',
          category: 'pembuka',
          text: liveChatSessionService.buildOpeningMessage(),
          description: 'Dikirim otomatis saat chat masuk pada jam operasional layanan'
        },
        {
          id: 'out_of_hours',
          title: 'Pesan Luar Jam Layanan',
          category: 'luar_jam',
          text: liveChatSessionService.buildOutOfHoursMessage(),
          description: 'Dikirim otomatis saat chat masuk di luar jam operasional petugas'
        },
        {
          id: 'delay',
          title: 'Pesan Penundaan (3 Hari Kerja)',
          category: 'penundaan',
          text: liveChatSessionService.buildDelayMessage(),
          description: 'Jika permintaan data butuh penyiapan teknis (maks. 3 hari kerja)'
        },
        {
          id: 'confirmation',
          title: 'Pesan Konfirmasi',
          category: 'konfirmasi',
          text: liveChatSessionService.buildConfirmationMessage(topic),
          description: 'Memastikan apakah penjelasan/data yang diberikan sudah jelas'
        },
        {
          id: 'termination_completed',
          title: 'Pesan Penutup: Layanan Selesai (+Survei SKD)',
          category: 'terminasi',
          text: liveChatSessionService.buildClosingCompletedMessage(topic),
          description: 'Terminasi konsultasi selesai dengan konfirmasi & link survei SKD'
        },
        {
          id: 'termination_midday_1400',
          title: 'Pesan Penutup: Sesi Siang (Pukul 14.00 WITA)',
          category: 'terminasi',
          text: liveChatSessionService.buildClosing1400Message(topic),
          description: 'Terminasi sesi konsultasi siang pukul 14.00 WITA (+ link survei SKD)'
        },
        {
          id: 'termination_end_of_day',
          title: 'Pesan Penutup: Jam Layanan Telah Selesai (Pukul 15.30 WITA)',
          category: 'terminasi',
          text: liveChatSessionService.buildClosingEndOfDayMessage(schedule),
          description: 'Terminasi saat jam operasional hari ini berakhir (+ link SIGAP & Web BPS)'
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
