// chatExplorerRoute.js - Express router for WhatsApp Chat & Backup Explorer
import express from 'express';
import messageStore from '../store/messageStore.js';

const router = express.Router();

let _getSock = () => null;
let _getIsConnected = () => false;
let _getNewsletters = null;

/**
 * Configure socket getters from server.js
 */
export function setExplorerSocketGetter(getSock, getIsConnected, getNewsletters) {
  _getSock = getSock;
  _getIsConnected = getIsConnected;
  if (getNewsletters) _getNewsletters = getNewsletters;
}

/**
 * Helper to format target JID
 */
function formatTargetJid(target) {
  let cleaned = String(target || '').trim();
  if (!cleaned) return null;
  if (
    cleaned.endsWith('@g.us') ||
    cleaned.endsWith('@s.whatsapp.net') ||
    cleaned.endsWith('@newsletter') ||
    cleaned.includes('@')
  ) {
    return cleaned;
  }
  cleaned = cleaned.replace(/[^\d]/g, '');
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
    const summaries = messageStore.getChatSummaries();
    const existingIds = new Set(summaries.map(s => s.id));

    // If socket is connected, merge participating groups & channels
    if (sock && isConn) {
      // 1. Fetch participating groups from WhatsApp Baileys
      try {
        const rawGroups = await sock.groupFetchAllParticipating();
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

    const stats = messageStore.getMessageStats();
    res.json({
      success: true,
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

    let detail = messageStore.getChatDetail(chatId);

    // If it's a group, enrich with live WhatsApp group metadata if available
    if (chatId.endsWith('@g.us') && sock && isConn) {
      try {
        const meta = await sock.groupMetadata(chatId);
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
    const { target, message } = req.body;
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

    console.log(`💬 [Explorer] Mengirim balasan ke ${jid}: "${message.slice(0, 50)}..."`);
    const sent = await sock.sendMessage(jid, { text: message });

    // Store the outgoing message locally in messageStore as well
    const outgoingMsg = {
      key: {
        id: sent?.key?.id || `out-${Date.now()}`,
        remoteJid: jid,
        fromMe: true,
      },
      message: {
        conversation: message,
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'SIGAP BPS Admin',
    };
    messageStore.saveMessages(jid, [outgoingMsg]);

    res.json({
      success: true,
      message: 'Pesan balasan berhasil dikirim melalui WhatsApp Gateway',
      message_id: sent?.key?.id,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    console.error('❌ [Explorer] Error sending reply:', err);
    res.status(500).json({ success: false, error: `Gagal mengirim balasan: ${err.message}` });
  }
});

export default router;
