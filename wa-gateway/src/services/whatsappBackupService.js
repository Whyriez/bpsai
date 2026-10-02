// whatsappBackupService.js - Gathers WhatsApp data for backup using the Baileys socket
// This module exports a factory that receives the getSock function to access the live socket.

import { executeWMexQuery } from '@whiskeysockets/baileys/lib/Socket/mex.js';

/**
 * Creates the backup service bound to a socket getter and message store.
 * @param {Function} getSock - Returns the current Baileys socket instance
 * @param {Function} getIsConnected - Returns whether the socket is connected
 * @param {object} messageStore - The messageStore module for accessing stored messages
 */
export function createBackupService(getSock, getIsConnected, messageStore) {

  /**
   * Gather WhatsApp data based on the requested scope.
   * @param {{ chats: boolean, groups: boolean, channels: boolean, messages: boolean, contacts: boolean }} scope
   * @returns {Promise<object>} The backup data object
   */
  async function gatherBackupData(scope) {
    const sock = getSock();
    const connected = getIsConnected();

    if (!connected || !sock) {
      throw new Error('WhatsApp Gateway belum terhubung. Silakan scan QR code terlebih dahulu.');
    }

    const result = {
      metadata: {
        created_at: new Date().toISOString(),
        phone: sock?.user?.id ? sock.user.id.split(':')[0] : null,
        scope,
      },
      groups: [],
      channels: [],
      contacts: {},
      messages: {},
    };

    // 1. Fetch groups
    if (scope.groups) {
      try {
        console.log('📋 [Backup] Mengambil daftar grup WhatsApp...');
        const allGroups = await sock.groupFetchAllParticipating();
        for (const [id, meta] of Object.entries(allGroups)) {
          if (id.endsWith('@g.us')) {
            const participants = (meta.participants || []).map(p => ({
              id: p.id,
              admin: p.admin || null,
            }));
            result.groups.push({
              id,
              subject: meta.subject || '',
              owner: meta.owner || null,
              creation: meta.creation || null,
              desc: meta.desc || '',
              participant_count: participants.length,
              participants,
            });
          }
        }
        console.log(`✅ [Backup] ${result.groups.length} grup ditemukan.`);
      } catch (err) {
        console.warn('⚠️ [Backup] Gagal mengambil grup:', err.message);
      }
    }

    // 2. Fetch channels (newsletters)
    if (scope.channels) {
      try {
        console.log('📋 [Backup] Mengambil daftar saluran/channel WhatsApp...');
        if (sock?.query && sock?.generateMessageTag) {
          const raw = await executeWMexQuery(
            {},
            '6388546374527196',
            'xwa2_newsletter_subscribed',
            sock.query,
            sock.generateMessageTag
          );
          const list = Array.isArray(raw)
            ? raw
            : (raw?.newsletters || raw?.edges || raw?.nodes || []);

          for (const item of list) {
            const n = item?.node || item;
            if (n && n.id) {
              result.channels.push({
                id: n.id,
                name: n.name || n.thread_metadata?.name?.text || 'Saluran WhatsApp',
                subscribers: n.subscribers || n.thread_metadata?.subscribers_count || 0,
                description: n.description || n.thread_metadata?.description?.text || '',
              });
            }
          }
        }
        console.log(`✅ [Backup] ${result.channels.length} saluran/channel ditemukan.`);
      } catch (err) {
        console.warn('⚠️ [Backup] Gagal mengambil saluran:', err.message);
      }
    }

    // 3. Fetch contacts from store (only legitimate direct contacts/chats)
    if (scope.contacts) {
      try {
        console.log('📇 [Backup] Mengambil daftar kontak...');
        result.contacts = messageStore.getContacts();
        console.log(`✅ [Backup] ${Object.keys(result.contacts).length} kontak ditemukan.`);
      } catch (err) {
        console.warn('⚠️ [Backup] Gagal mengambil kontak:', err.message);
      }
    }

    // 4. Fetch stored direct chats
    if (scope.chats) {
      try {
        console.log('💬 [Backup] Mengambil daftar percakapan tersimpan...');
        result.chats = messageStore.getStoredChats() || {};
        console.log(`✅ [Backup] ${Object.keys(result.chats).length} percakapan ditemukan.`);
      } catch (err) {
        console.warn('⚠️ [Backup] Gagal mengambil daftar percakapan:', err.message);
      }
    }

    // 5. Fetch stored messages (chat history)
    if (scope.messages) {
      try {
        console.log('💬 [Backup] Mengambil riwayat pesan tersimpan...');
        result.messages = messageStore.getAllMessages();
        const totalChats = Object.keys(result.messages).length;
        const totalMsgs = Object.values(result.messages).reduce((sum, msgs) => sum + msgs.length, 0);
        console.log(`✅ [Backup] ${totalMsgs} pesan dari ${totalChats} chat ditemukan.`);
      } catch (err) {
        console.warn('⚠️ [Backup] Gagal mengambil riwayat pesan:', err.message);
      }
    }

    return result;
  }

  return { gatherBackupData };
}
