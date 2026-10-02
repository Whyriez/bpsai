// messageStore.js — Persistent message storage for WhatsApp backup
// Stores messages per-chat as JSON files in wa-gateway/data/messages/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory: wa-gateway/data/messages/ and wa-gateway/data/media/
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'messages');
const CONTACTS_FILE = path.join(__dirname, '..', '..', 'data', 'contacts.json');
const CHATS_FILE = path.join(__dirname, '..', '..', 'data', 'chats.json');
const MEDIA_DIR = path.join(__dirname, '..', '..', 'data', 'media');
const LID_MAP_FILE = path.join(__dirname, '..', '..', 'data', 'lid_map.json');

// Ensure data dirs exist
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }
  const dataRoot = path.dirname(CONTACTS_FILE);
  if (!fs.existsSync(dataRoot)) {
    fs.mkdirSync(dataRoot, { recursive: true });
  }
}

/**
 * Handle LID (Linked Identity) to real Phone Number (JID) mapping.
 */
function handlePhoneNumberShare({ lid, jid }) {
  if (!lid || !jid) return;
  ensureDir();
  let map = {};
  try {
    if (fs.existsSync(LID_MAP_FILE)) {
      map = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
    }
  } catch (e) {}
  map[lid] = jid;
  try {
    fs.writeFileSync(LID_MAP_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {}
}

function resolveLidToPhone(lidOrJid) {
  if (!lidOrJid) return lidOrJid;
  if (lidOrJid.endsWith('@s.whatsapp.net')) return lidOrJid;
  try {
    if (fs.existsSync(LID_MAP_FILE)) {
      const map = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
      if (map[lidOrJid]) return map[lidOrJid];
    }
  } catch (e) {}
  return lidOrJid;
}

/**
 * Sanitize chat ID for use as filename.
 * Replace characters invalid in Windows filenames.
 */
function sanitizeId(chatId) {
  return String(chatId).replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * Get the file path for a specific chat.
 */
function chatFilePath(chatId) {
  return path.join(DATA_DIR, `${sanitizeId(chatId)}.json`);
}

/**
 * Read existing messages for a chat, or return empty array.
 */
function readChatMessages(chatId) {
  const fp = chatFilePath(chatId);
  try {
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    }
  } catch (err) {
    console.warn(`⚠️ [MessageStore] Error reading ${fp}:`, err.message);
  }
  return [];
}

/**
 * Write messages array to a chat file.
 */
function writeChatMessages(chatId, messages) {
  ensureDir();
  const fp = chatFilePath(chatId);
  try {
    fs.writeFileSync(fp, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error(`❌ [MessageStore] Error writing ${fp}:`, err.message);
  }
}

/**
 * Unwraps nested message structures common in modern WhatsApp (ephemeral, viewOnce, etc.)
 */
function unwrapMessage(msg) {
  let content = msg?.message;
  if (!content) return {};
  for (let i = 0; i < 5; i++) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.documentWithCaptionMessage?.message ||
      content.editedMessage?.message?.protocolMessage?.editedMessage ||
      content.templateMessage?.hydratedTemplate ||
      content.templateMessage?.hydratedFourRowTemplate;
    if (!inner) break;
    content = inner;
  }
  return content;
}

/**
 * Extract relevant data from a Baileys message for storage.
 * Keeps it lightweight — no binary media blobs.
 */
function extractMessageData(msg) {
  const content = unwrapMessage(msg);
  // Determine message type and text
  let type = 'unknown';
  let text = '';
  let mediaInfo = null;

  if (content.conversation) {
    type = 'text';
    text = content.conversation;
  } else if (content.extendedTextMessage?.text) {
    type = 'text';
    text = content.extendedTextMessage.text;
  } else if (content.imageMessage) {
    type = 'image';
    text = content.imageMessage.caption || '';
    mediaInfo = { mimetype: content.imageMessage.mimetype };
  } else if (content.videoMessage) {
    type = 'video';
    text = content.videoMessage.caption || '';
    mediaInfo = { mimetype: content.videoMessage.mimetype };
  } else if (content.audioMessage) {
    type = 'audio';
    mediaInfo = { mimetype: content.audioMessage.mimetype, seconds: content.audioMessage.seconds };
  } else if (content.documentMessage) {
    type = 'document';
    text = content.documentMessage.fileName || content.documentMessage.caption || '';
    mediaInfo = { mimetype: content.documentMessage.mimetype, fileName: content.documentMessage.fileName };
  } else if (content.stickerMessage) {
    type = 'sticker';
  } else if (content.contactMessage) {
    type = 'contact';
    text = content.contactMessage.displayName || '';
  } else if (content.contactsArrayMessage) {
    type = 'contact';
    text = (content.contactsArrayMessage.contacts || []).map(c => c.displayName).join(', ');
  } else if (content.locationMessage) {
    type = 'location';
    text = content.locationMessage.name || content.locationMessage.address || '';
    mediaInfo = {
      latitude: content.locationMessage.degreesLatitude,
      longitude: content.locationMessage.degreesLongitude,
    };
  } else if (content.reactionMessage) {
    type = 'reaction';
    text = content.reactionMessage.text || '';
  } else if (content.protocolMessage) {
    type = 'protocol';
    text = content.protocolMessage.type !== undefined ? `protocol_type_${content.protocolMessage.type}` : '';
  } else {
    // Try to find any text-like content
    const keys = Object.keys(content);
    if (keys.length > 0) {
      type = keys[0].replace('Message', '');
      text = content[keys[0]]?.caption || content[keys[0]]?.text || '';
    }
  }

  // Determine timestamp
  let timestamp = null;
  if (msg.messageTimestamp) {
    timestamp = typeof msg.messageTimestamp === 'object'
      ? Number(msg.messageTimestamp.low || msg.messageTimestamp)
      : Number(msg.messageTimestamp);
  } else {
    timestamp = Math.floor(Date.now() / 1000);
  }

  return {
    id: msg.key?.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    from: msg.key?.remoteJid || null,
    fromMe: Boolean(msg.key?.fromMe),
    participant: msg.key?.participant || null, // sender in group chats
    timestamp,
    type,
    text,
    mediaInfo,
    pushName: msg.pushName || null, // sender's display name
  };
}

/**
 * Save new messages for a given chat (append, dedup by ID).
 */
function saveMessages(chatId, rawMessages) {
  if (!chatId || !rawMessages || rawMessages.length === 0) return;

  const existing = readChatMessages(chatId);
  const existingIds = new Set(existing.map(m => m.id));

  let added = 0;
  for (const msg of rawMessages) {
    const extracted = extractMessageData(msg);
    if (extracted.id && !existingIds.has(extracted.id)) {
      existing.push(extracted);
      existingIds.add(extracted.id);
      added++;
    }
  }

  if (added > 0) {
    // Sort by timestamp
    existing.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    writeChatMessages(chatId, existing);
  }

  return added;
}

/**
 * Handle the messages.upsert event from Baileys.
 * Groups messages by chatId and saves them.
 */
function handleMessagesUpsert(upsert) {
  const messages = upsert.messages || [];
  if (messages.length === 0) return;

  // Group by chat
  const byChatId = {};
  for (const msg of messages) {
    const chatId = msg.key?.remoteJid;
    if (!chatId || chatId === 'status@broadcast') continue;

    // Automatically record sender's pushName as contact
    if (msg.pushName && !chatId.endsWith('@g.us') && !chatId.endsWith('@newsletter')) {
      saveContacts([{
        id: chatId,
        name: msg.pushName,
        notify: msg.pushName,
      }]);
    }

    if (!byChatId[chatId]) byChatId[chatId] = [];
    byChatId[chatId].push(msg);
  }

  let totalAdded = 0;
  for (const [chatId, msgs] of Object.entries(byChatId)) {
    totalAdded += saveMessages(chatId, msgs) || 0;
  }

  if (totalAdded > 0) {
    console.log(`💾 [MessageStore] ${totalAdded} pesan baru disimpan dari ${Object.keys(byChatId).length} chat.`);
  }
}

/**
 * Handle the messaging-history.set event (initial sync).
 * This receives bulk history data when first connecting.
 */
function handleHistorySync(data) {
  const { chats, contacts, messages, isLatest } = data;

  console.log(`📥 [MessageStore] History sync diterima: ${messages?.length || 0} pesan, ${chats?.length || 0} chat, ${contacts?.length || 0} kontak (isLatest: ${isLatest})`);

  // Save messages
  if (messages && messages.length > 0) {
    const byChatId = {};
    for (const msgItem of messages) {
      const msg = msgItem.message || msgItem;
      const chatId = msg.key?.remoteJid;
      if (!chatId || chatId === 'status@broadcast') continue;
      if (!byChatId[chatId]) byChatId[chatId] = [];
      byChatId[chatId].push(msg);
    }

    let totalAdded = 0;
    for (const [chatId, msgs] of Object.entries(byChatId)) {
      totalAdded += saveMessages(chatId, msgs) || 0;
    }
    console.log(`💾 [MessageStore] ${totalAdded} pesan dari history sync disimpan ke ${Object.keys(byChatId).length} chat.`);
  }

  // Save chats
  if (chats && chats.length > 0) {
    saveChats(chats);
  }

  // Save contacts
  if (contacts && contacts.length > 0) {
    saveContacts(contacts);
  }
}

/**
 * Save/merge chats.
 */
function saveChats(newChats) {
  ensureDir();
  let existing = {};
  try {
    if (fs.existsSync(CHATS_FILE)) {
      existing = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    }
  } catch (e) {}

  for (const c of newChats) {
    const id = c.id;
    if (!id || id === 'status@broadcast') continue;
    existing[id] = {
      id,
      conversationTimestamp: c.conversationTimestamp
        ? (typeof c.conversationTimestamp === 'object' ? Number(c.conversationTimestamp.low || c.conversationTimestamp) : Number(c.conversationTimestamp))
        : (existing[id]?.conversationTimestamp || null),
      unreadCount: c.unreadCount || existing[id]?.unreadCount || 0,
      name: c.name || existing[id]?.name || null,
    };
  }

  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`💬 [MessageStore] ${Object.keys(existing).length} obrolan disimpan ke chats.json.`);
  } catch (e) {}
}

/**
 * Handle chats.upsert event from Baileys.
 */
function handleChatsUpsert(chats) {
  if (chats && chats.length > 0) {
    saveChats(chats);
  }
}

/**
 * Get all stored chats.
 */
function getStoredChats() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      return JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

/**
 * Save/merge contacts.
 */
function saveContacts(newContacts) {
  ensureDir();
  let existing = {};
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      existing = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    }
  } catch (e) { /* ignore */ }

  for (const c of newContacts) {
    const id = c.id || c.jid;
    if (!id) continue;
    existing[id] = {
      id,
      name: c.name || c.notify || c.verifiedName || existing[id]?.name || id,
      notify: c.notify || existing[id]?.notify || null,
      verifiedName: c.verifiedName || existing[id]?.verifiedName || null,
      imgUrl: c.imgUrl || existing[id]?.imgUrl || null,
    };
  }

  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`📇 [MessageStore] ${Object.keys(existing).length} kontak disimpan.`);
}

/**
 * Handle contacts.upsert event from Baileys.
 */
function handleContactsUpsert(contacts) {
  if (contacts && contacts.length > 0) {
    saveContacts(contacts);
  }
}

/**
 * Get all stored contacts.
 */
function getContacts() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

/**
/**
 * Check if a JID represents a valid phone number or real user contact,
 * filtering out internal group-privacy pseudorandom LIDs.
 */
function isValidPhoneNumber(jid) {
  if (!jid) return false;
  if (jid.includes('260593114161297')) return true; // user's own self bot
  const num = jid.split('@')[0].replace(/[^\d]/g, '');
  if (num.startsWith('62') && num.length >= 10 && num.length <= 14) return true;
  if (num.length >= 8 && num.length <= 13 && !num.startsWith('175') && !num.startsWith('149') && !num.startsWith('267')) {
    return true;
  }
  return false;
}

/**
 * Harvest contacts from group participants.
 * (Disabled: group members belong inside group.participants, not as personal 1-on-1 direct chats).
 */
function harvestGroupContacts(rawGroups) {
  return 0;
}

/**
 * Get all stored messages, organized by chat ID.
 */
function getAllMessages() {
  ensureDir();
  const result = {};
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const chatId = file.replace('.json', '');
      const fp = path.join(DATA_DIR, file);
      try {
        const messages = JSON.parse(fs.readFileSync(fp, 'utf8'));
        result[chatId] = messages;
      } catch (e) {
        console.warn(`⚠️ [MessageStore] Error reading ${file}:`, e.message);
      }
    }
  } catch (e) {
    console.warn('⚠️ [MessageStore] Error listing messages dir:', e.message);
  }
  return result;
}

/**
 * Get stats about stored messages.
 */
function getMessageStats() {
  ensureDir();
  let totalChats = 0;
  let totalMessages = 0;
  let oldestTimestamp = null;
  let newestTimestamp = null;

  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    totalChats = files.length;

    for (const file of files) {
      const fp = path.join(DATA_DIR, file);
      try {
        const messages = JSON.parse(fs.readFileSync(fp, 'utf8'));
        totalMessages += messages.length;
        for (const m of messages) {
          if (m.timestamp) {
            if (!oldestTimestamp || m.timestamp < oldestTimestamp) oldestTimestamp = m.timestamp;
            if (!newestTimestamp || m.timestamp > newestTimestamp) newestTimestamp = m.timestamp;
          }
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  // Contacts count
  let totalContacts = 0;
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
      totalContacts = Object.keys(contacts).length;
    }
  } catch (e) { /* ignore */ }

  return {
    total_chats: totalChats,
    total_messages: totalMessages,
    total_contacts: totalContacts,
    oldest_message: oldestTimestamp ? new Date(oldestTimestamp * 1000).toISOString() : null,
    newest_message: newestTimestamp ? new Date(newestTimestamp * 1000).toISOString() : null,
  };
}

/**
 * Extract URLs from a text string.
 */
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /(https?:\/\/[^\s<>"'()]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Format raw WhatsApp phone number to human friendly format.
 */
function formatPhoneNumber(jid) {
  if (!jid) return '';
  if (jid.includes('260593114161297')) {
    return '+62 895-7074-91166 (Nomor Anda)';
  }
  const num = jid.split('@')[0].replace(/[^\d]/g, '');
  if (num.startsWith('62')) {
    return `+62 ${num.slice(2, 5)}-${num.slice(5, 9)}-${num.slice(9)}`;
  }
  return `+${num}`;
}

/**
 * Get summaries of all stored chats for the WhatsApp Explorer list.
 */
function getChatSummaries() {
  ensureDir();
  const contacts = getContacts();
  const summaries = [];

  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const fp = path.join(DATA_DIR, file);
      try {
        const messages = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (!Array.isArray(messages) || messages.length === 0) continue;

        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];
        const chatId = firstMsg?.from || file.replace('.json', '');

        const isGroup = chatId.endsWith('@g.us');
        const isChannel = chatId.endsWith('@newsletter');
        const isDirect = chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid');

        // Determine best display name
        let name = null;
        if (contacts[chatId]?.name && contacts[chatId]?.name !== chatId) {
          name = contacts[chatId].name;
        } else {
          // Look for any incoming pushName
          for (let i = messages.length - 1; i >= 0; i--) {
            if (!messages[i].fromMe && messages[i].pushName) {
              name = messages[i].pushName;
              break;
            }
          }
        }

        if (!name || name === chatId) {
          if (chatId.includes('260593114161297')) {
            name = 'Catatan / Nomor Pribadi (+62 895-7074-91166)';
          } else if (isDirect && chatId.endsWith('@s.whatsapp.net')) {
            name = formatPhoneNumber(chatId);
          } else if (isGroup) {
            name = `Grup (${chatId.split('@')[0].slice(-6)})`;
          } else if (isChannel) {
            name = `Saluran (${chatId.split('@')[0].slice(-6)})`;
          } else {
            name = chatId.endsWith('@lid') ? `Kontak Pribadi (LID ${chatId.split('@')[0].slice(-4)})` : chatId;
          }
        }

        // Count media and links
        let mediaCount = 0;
        let linkCount = 0;
        const participantMap = {};

        for (const m of messages) {
          if (['image', 'video', 'audio', 'document', 'sticker'].includes(m.type)) {
            mediaCount++;
          }
          if (m.text && extractUrls(m.text).length > 0) {
            linkCount++;
          }
          const senderJid = m.participant || (!m.fromMe ? m.from : null);
          if (senderJid && !participantMap[senderJid]) {
            participantMap[senderJid] = {
              jid: senderJid,
              phone: formatPhoneNumber(senderJid),
              name: m.pushName || contacts[senderJid]?.name || formatPhoneNumber(senderJid),
            };
          }
        }

        summaries.push({
          id: chatId,
          name,
          phone: isDirect ? formatPhoneNumber(chatId) : null,
          raw_phone: isDirect ? chatId.split('@')[0] : null,
          type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
          is_group: isGroup,
          is_channel: isChannel,
          is_direct: isDirect,
          message_count: messages.length,
          media_count: mediaCount,
          link_count: linkCount,
          participant_count: Object.keys(participantMap).length,
          participants: Object.values(participantMap),
          last_message: {
            text: lastMsg.text || (lastMsg.type !== 'text' ? `[${lastMsg.type}]` : ''),
            type: lastMsg.type,
            timestamp: lastMsg.timestamp,
            date: lastMsg.timestamp ? new Date(lastMsg.timestamp * 1000).toISOString() : null,
            fromMe: lastMsg.fromMe,
            sender: lastMsg.pushName || (lastMsg.fromMe ? 'Saya / Bot' : null),
          },
        });
      } catch (err) {
        console.warn(`⚠️ [MessageStore] Error summarizing ${file}:`, err.message);
      }
    }

    const existingIds = new Set(summaries.map(s => s.id));

    // Also include chats from chats.json (if not already having message files)
    const storedChats = getStoredChats();
    for (const [id, c] of Object.entries(storedChats)) {
      if (!existingIds.has(id)) {
        const isGroup = id.endsWith('@g.us');
        const isChannel = id.endsWith('@newsletter');
        const isDirect = id.endsWith('@s.whatsapp.net');

        let name = c.name || contacts[id]?.name;
        if (!name) {
          name = isDirect ? formatPhoneNumber(id) : id;
        }

        summaries.push({
          id,
          name,
          phone: isDirect ? formatPhoneNumber(id) : null,
          raw_phone: isDirect ? id.split('@')[0] : null,
          type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
          is_group: isGroup,
          is_channel: isChannel,
          is_direct: isDirect,
          message_count: 0,
          media_count: 0,
          link_count: 0,
          participant_count: 1,
          participants: isDirect ? [{ jid: id, phone: formatPhoneNumber(id), name }] : [],
          last_message: {
            text: isDirect ? 'Obrolan kontak pribadi' : (isGroup ? 'Grup WhatsApp' : 'Saluran'),
            type: 'text',
            timestamp: c.conversationTimestamp,
            date: c.conversationTimestamp ? new Date(c.conversationTimestamp * 1000).toISOString() : null,
            fromMe: false,
            sender: null,
          },
        });
        existingIds.add(id);
      }
    }

    // Also include contacts from contacts.json as direct chats if not already listed and has valid phone
    for (const [jid, contact] of Object.entries(contacts)) {
      if (!existingIds.has(jid) && isValidPhoneNumber(jid)) {
        const phone = formatPhoneNumber(jid);
        const name = contact.name || phone;
        summaries.push({
          id: jid,
          name,
          phone,
          raw_phone: jid.split('@')[0],
          type: 'direct',
          is_group: false,
          is_channel: false,
          is_direct: true,
          message_count: 0,
          media_count: 0,
          link_count: 0,
          participant_count: 1,
          participants: [{ jid, phone, name }],
          last_message: {
            text: 'Kontak WhatsApp',
            type: 'text',
            timestamp: null,
            date: null,
            fromMe: false,
            sender: null,
          },
        });
        existingIds.add(jid);
      }
    }

    // Sort descending by newest message timestamp
    summaries.sort((a, b) => {
      const tsA = a.last_message?.timestamp || 0;
      const tsB = b.last_message?.timestamp || 0;
      return tsB - tsA;
    });

  } catch (err) {
    console.error('❌ [MessageStore] Error reading summaries:', err);
  }

  return summaries;
}

/**
 * Get full chat details including parsed messages, links, media, and participants.
 */
function getChatDetail(chatId) {
  ensureDir();
  const contacts = getContacts();

  // Try exact or sanitized file path
  let messages = readChatMessages(chatId);
  if (messages.length === 0) {
    const safe = sanitizeId(chatId);
    messages = readChatMessages(safe);
  }

  const isGroup = chatId.endsWith('@g.us');
  const isChannel = chatId.endsWith('@newsletter');
  const isDirect = chatId.endsWith('@s.whatsapp.net');

  let chatName = contacts[chatId]?.name || null;
  if (!chatName) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].fromMe && messages[i].pushName) {
        chatName = messages[i].pushName;
        break;
      }
    }
  }
  if (!chatName || chatName === chatId) {
    if (chatId.includes('260593114161297')) {
      chatName = 'Catatan / Nomor Pribadi (+62 895-7074-91166)';
    } else {
      chatName = isDirect ? formatPhoneNumber(chatId) : chatId;
    }
  }

  // If no stored messages yet but contact exists or is direct chat, return clean contact view
  if (messages.length === 0 && (contacts[chatId] || isDirect)) {
    const phone = formatPhoneNumber(chatId);
    return {
      id: chatId,
      name: chatName || phone,
      phone: isDirect ? phone : null,
      raw_phone: isDirect ? chatId.split('@')[0] : null,
      type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
      is_group: isGroup,
      is_channel: isChannel,
      is_direct: isDirect,
      messages: [
        {
          id: 'meta-contact-info',
          fromMe: false,
          text: `Kontak WhatsApp: ${chatName || phone} (${phone}). Belum ada riwayat pesan lokal. Anda dapat langsung mengetik dan mengirim pesan balasan di kolom bawah.`,
          type: 'text',
          timestamp: Math.floor(Date.now() / 1000),
          pushName: 'Sistem SIGAP',
        }
      ],
      links: [],
      media: [],
      participants: [{ jid: chatId, phone, name: chatName || phone, message_count: 0 }],
      total_messages: 0,
      total_links: 0,
      total_media: 0,
    };
  }

  const links = [];
  const media = [];
  const participantStats = {};

  messages.forEach((m, idx) => {
    // Media detection
    if (['image', 'video', 'audio', 'document', 'sticker'].includes(m.type) || m.mediaInfo) {
      media.push({
        id: m.id || `media-${idx}`,
        type: m.type,
        caption: m.text || '',
        mediaInfo: m.mediaInfo || {},
        timestamp: m.timestamp,
        date: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
        fromMe: m.fromMe,
        sender: m.pushName || (m.fromMe ? 'Saya / Bot' : formatPhoneNumber(m.participant || m.from)),
      });
    }

    // Links detection
    if (m.text) {
      const urls = extractUrls(m.text);
      urls.forEach(url => {
        links.push({
          url,
          context: m.text,
          timestamp: m.timestamp,
          date: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
          fromMe: m.fromMe,
          sender: m.pushName || (m.fromMe ? 'Saya / Bot' : formatPhoneNumber(m.participant || m.from)),
        });
      });
    }

    // Participant stats
    const pJid = m.participant || (!m.fromMe ? m.from : null);
    if (pJid) {
      if (!participantStats[pJid]) {
        participantStats[pJid] = {
          jid: pJid,
          phone: formatPhoneNumber(pJid),
          raw_phone: pJid.split('@')[0],
          name: m.pushName || contacts[pJid]?.name || formatPhoneNumber(pJid),
          message_count: 0,
          first_seen: m.timestamp,
          last_seen: m.timestamp,
        };
      }
      participantStats[pJid].message_count++;
      if (m.timestamp && (!participantStats[pJid].first_seen || m.timestamp < participantStats[pJid].first_seen)) {
        participantStats[pJid].first_seen = m.timestamp;
      }
      if (m.timestamp && (!participantStats[pJid].last_seen || m.timestamp > participantStats[pJid].last_seen)) {
        participantStats[pJid].last_seen = m.timestamp;
      }
    }
  });

  return {
    id: chatId,
    name: chatName,
    phone: isDirect ? formatPhoneNumber(chatId) : null,
    raw_phone: isDirect ? chatId.split('@')[0] : null,
    type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
    is_group: isGroup,
    is_channel: isChannel,
    is_direct: isDirect,
    messages,
    links,
    media,
    participants: Object.values(participantStats).sort((a, b) => b.message_count - a.message_count),
    total_messages: messages.length,
    total_links: links.length,
    total_media: media.length,
  };
}

/**
 * List available backup ZIP files from wa-gateway/backups/
 */
function listBackupZips() {
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) return [];

  try {
    const files = fs.readdirSync(backupDir).filter(f => {
      if (!f.endsWith('.zip')) return false;
      try {
        const stat = fs.statSync(path.join(backupDir, f));
        return stat.size > 22;
      } catch (e) {
        return false;
      }
    });

    return files.map(filename => {
      const fp = path.join(backupDir, filename);
      const stat = fs.statSync(fp);
      return {
        filename,
        path: fp,
        size_bytes: stat.size,
        size_formatted: `${(stat.size / 1024).toFixed(1)} KB`,
        created_at: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.warn('⚠️ [MessageStore] Error listing backups:', err.message);
    return [];
  }
}

/**
 * Inspect contents of a backup ZIP file without full disk extraction.
 */
async function inspectBackupZip(zipFilename) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const AdmZip = require('adm-zip');

  const backupDir = path.join(__dirname, '..', '..', 'backups');
  const zipPath = path.isAbsolute(zipFilename) ? zipFilename : path.join(backupDir, zipFilename);

  if (!fs.existsSync(zipPath)) {
    throw new Error(`Berkas backup ${zipFilename} tidak ditemukan.`);
  }

  const stat = fs.statSync(zipPath);
  if (stat.size < 22) {
    throw new Error(`Berkas backup ${zipFilename} kosong atau tidak valid.`);
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  let backupInfo = null;
  let groups = [];
  let channels = [];
  let contacts = {};
  let messageIndex = [];
  const chatFiles = {};

  for (const entry of entries) {
    const entryName = entry.entryName;
    if (entryName === 'backup_info.json') {
      try {
        backupInfo = JSON.parse(entry.getData().toString('utf8'));
      } catch (e) {}
    } else if (entryName === 'groups.json') {
      try {
        groups = JSON.parse(entry.getData().toString('utf8'));
      } catch (e) {}
    } else if (entryName === 'channels.json') {
      try {
        channels = JSON.parse(entry.getData().toString('utf8'));
      } catch (e) {}
    } else if (entryName === 'contacts.json') {
      try {
        contacts = JSON.parse(entry.getData().toString('utf8'));
      } catch (e) {}
    } else if (entryName === 'messages/_index.json') {
      try {
        messageIndex = JSON.parse(entry.getData().toString('utf8'));
      } catch (e) {}
    } else if (entryName.startsWith('messages/') && entryName.endsWith('.json') && entryName !== 'messages/_index.json') {
      const baseName = path.basename(entryName, '.json');
      chatFiles[baseName] = entryName;
    }
  }

  // Build unified summaries array for explorer sidebar
  const summaries = [];
  const existingIds = new Set();

  // 1. Process messageIndex (chats with recorded messages)
  for (const m of messageIndex) {
    const id = m.chat_id || m.id;
    if (!id) continue;
    const isGroup = id.endsWith('@g.us');
    const isChannel = id.endsWith('@newsletter');
    const isDirect = !isGroup && !isChannel;
    let name = m.chat_name || m.name || contacts[id]?.name;
    if (!name) {
      name = isDirect ? formatPhoneNumber(id) : id;
    }
    if (id.includes('260593114161297')) {
      name = 'Catatan / Nomor Pribadi (+62 895-7074-91166)';
    }

    summaries.push({
      id,
      name,
      phone: isDirect ? formatPhoneNumber(id) : null,
      raw_phone: isDirect ? id.split('@')[0] : null,
      type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
      is_group: isGroup,
      is_channel: isChannel,
      is_direct: isDirect,
      message_count: m.message_count || 0,
      media_count: 0,
      link_count: 0,
      participant_count: 1,
      last_message: m.last_message || {
        text: 'Riwayat pesan backup tersimpan',
        type: 'text',
        timestamp: m.newest ? Math.floor(new Date(m.newest).getTime() / 1000) : null,
        fromMe: false,
      },
    });
    existingIds.add(id);
  }

  // 2. Also add contacts from contacts.json ONLY if valid phone number
  for (const [jid, contact] of Object.entries(contacts)) {
    if (!existingIds.has(jid) && isValidPhoneNumber(jid)) {
      const isGroup = jid.endsWith('@g.us');
      const isChannel = jid.endsWith('@newsletter');
      const isDirect = !isGroup && !isChannel;
      const phone = formatPhoneNumber(jid);
      let name = contact.name || phone;
      if (jid.includes('260593114161297')) {
        name = 'Catatan / Nomor Pribadi (+62 895-7074-91166)';
      }

      summaries.push({
        id: jid,
        name,
        phone: isDirect ? phone : null,
        raw_phone: isDirect ? jid.split('@')[0] : null,
        type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
        is_group: isGroup,
        is_channel: isChannel,
        is_direct: isDirect,
        message_count: 0,
        media_count: 0,
        link_count: 0,
        participant_count: 1,
        last_message: {
          text: 'Kontak tersimpan dalam backup',
          type: 'text',
          timestamp: null,
          fromMe: false,
        },
      });
      existingIds.add(jid);
    }
  }

  // 3. Also add groups from groups.json
  for (const grp of groups) {
    const id = grp.id;
    if (id && !existingIds.has(id)) {
      summaries.push({
        id,
        name: grp.subject || grp.name || 'Grup WhatsApp',
        phone: null,
        raw_phone: null,
        type: grp.type || (grp.is_channel ? 'channel' : 'group'),
        is_group: !grp.is_channel,
        is_channel: !!grp.is_channel,
        is_direct: false,
        message_count: 0,
        media_count: 0,
        link_count: 0,
        participant_count: grp.participant_count || (grp.participants?.length || 0),
        last_message: {
          text: grp.desc || 'Grup WhatsApp tersimpan dalam backup',
          type: 'text',
          timestamp: grp.creation || null,
          fromMe: false,
        },
      });
      existingIds.add(id);
    }
  }

  // 4. Also add channels from channels.json
  for (const ch of channels) {
    const id = ch.id;
    if (id && !existingIds.has(id)) {
      summaries.push({
        id,
        name: ch.name || 'Saluran WhatsApp',
        phone: null,
        raw_phone: null,
        type: 'channel',
        is_group: false,
        is_channel: true,
        is_direct: false,
        message_count: 0,
        media_count: 0,
        link_count: 0,
        participant_count: ch.member_count || ch.subscribers || 0,
        last_message: {
          text: ch.desc || 'Saluran WhatsApp tersimpan dalam backup',
          type: 'text',
          timestamp: null,
          fromMe: false,
        },
      });
      existingIds.add(id);
    }
  }

  return {
    filename: path.basename(zipPath),
    backup_info: backupInfo,
    summary: {
      total_groups: groups.length,
      total_channels: channels.length,
      total_contacts: Object.keys(contacts).length,
      total_chats: summaries.length,
      total_messages: messageIndex.reduce((s, c) => s + (c.message_count || 0), 0),
    },
    chats: summaries,
    groups,
    channels,
    contacts,
  };
}

/**
 * Get messages of a specific chat from an in-memory inspected ZIP.
 */
async function getBackupZipChat(zipFilename, chatId) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const AdmZip = require('adm-zip');

  const backupDir = path.join(__dirname, '..', '..', 'backups');
  const zipPath = path.isAbsolute(zipFilename) ? zipFilename : path.join(backupDir, zipFilename);

  if (!fs.existsSync(zipPath)) {
    throw new Error(`Berkas backup ${zipFilename} tidak ditemukan.`);
  }

  const zip = new AdmZip(zipPath);
  const safeId = sanitizeId(chatId);

  // Look for possible entry paths
  let entry = zip.getEntry(`messages/${safeId}.json`);
  if (!entry) {
    entry = zip.getEntry(`messages/${chatId}.json`);
  }
  if (!entry) {
    // Search among all entries
    const all = zip.getEntries();
    entry = all.find(e => e.entryName.includes(safeId) || e.entryName.includes(chatId));
  }

  let messages = [];

  if (entry) {
    messages = JSON.parse(entry.getData().toString('utf8'));
  } else {
    // Check if it exists in groups.json
    let foundGroup = null;
    const grpEntry = zip.getEntry('groups.json');
    if (grpEntry) {
      try {
        const groups = JSON.parse(grpEntry.getData().toString('utf8'));
        foundGroup = groups.find(g => g.id === chatId || g.id?.includes(safeId));
      } catch (e) {}
    }

    // Check if it exists in channels.json
    let foundChannel = null;
    const chEntry = zip.getEntry('channels.json');
    if (chEntry) {
      try {
        const channels = JSON.parse(chEntry.getData().toString('utf8'));
        foundChannel = channels.find(c => c.id === chatId || c.id?.includes(safeId));
      } catch (e) {}
    }

    if (foundGroup) {
      const participantsList = (foundGroup.participants || []).map(p => ({
        jid: typeof p === 'object' ? p.id : p,
        phone: typeof p === 'object' ? (p.id || '').split('@')[0] : String(p).split('@')[0],
        raw_phone: typeof p === 'object' ? (p.id || '').split('@')[0] : String(p).split('@')[0],
        name: typeof p === 'object' ? (p.id || '').split('@')[0] : String(p).split('@')[0],
        message_count: 0,
      }));

      return {
        id: foundGroup.id,
        name: foundGroup.subject || `Grup (${foundGroup.id.split('@')[0].slice(-6)})`,
        phone: null,
        raw_phone: null,
        type: 'group',
        is_group: true,
        is_channel: false,
        is_direct: false,
        messages: [
          {
            id: 'meta-desc',
            fromMe: false,
            text: foundGroup.desc || `Grup WhatsApp dengan ${participantsList.length} anggota terdaftar dalam arsip backup.`,
            type: 'text',
            timestamp: foundGroup.creation,
            pushName: 'Sistem Backup',
          }
        ],
        links: extractUrls(foundGroup.desc || []).map(u => ({ url: u, context: foundGroup.desc, timestamp: foundGroup.creation, fromMe: false, sender: 'Deskripsi Grup' })),
        media: [],
        participants: participantsList,
        total_messages: 0,
        total_links: 0,
        total_media: 0,
      };
    } else if (foundChannel) {
      return {
        id: foundChannel.id,
        name: foundChannel.name || 'Saluran Resmi',
        phone: null,
        raw_phone: null,
        type: 'channel',
        is_group: false,
        is_channel: true,
        is_direct: false,
        messages: [
          {
            id: 'meta-desc',
            fromMe: false,
            text: foundChannel.description || `Saluran Resmi WhatsApp (${foundChannel.subscribers || 0} pelanggan).`,
            type: 'text',
            timestamp: null,
            pushName: 'Saluran Resmi',
          }
        ],
        links: [],
        media: [],
        participants: [],
        total_messages: 0,
        total_links: 0,
        total_media: 0,
      };
    }

    // Check if it exists in contacts.json
    let foundContact = null;
    const cntEntry = zip.getEntry('contacts.json');
    if (cntEntry) {
      try {
        const contactsObj = JSON.parse(cntEntry.getData().toString('utf8'));
        foundContact = contactsObj[chatId] || Object.values(contactsObj).find(c => c.id === chatId || (c.id && c.id.includes(safeId)));
      } catch (e) {}
    }

    if (foundContact) {
      const contactJid = foundContact.id || chatId;
      const phone = formatPhoneNumber(contactJid);
      return {
        id: contactJid,
        name: foundContact.name || phone,
        phone,
        raw_phone: contactJid.split('@')[0],
        type: 'direct',
        is_group: false,
        is_channel: false,
        is_direct: true,
        messages: [
          {
            id: 'meta-contact-info',
            fromMe: false,
            text: `Kontak WhatsApp terdaftar di backup: ${foundContact.name || phone} (${phone}). Belum ada riwayat pesan dalam arsip ini.`,
            type: 'text',
            timestamp: Math.floor(Date.now() / 1000),
            pushName: 'Sistem Backup',
          }
        ],
        links: [],
        media: [],
        participants: [{ jid: contactJid, phone, name: foundContact.name || phone, message_count: 0 }],
        total_messages: 0,
        total_links: 0,
        total_media: 0,
      };
    }

    throw new Error(`Percakapan ${chatId} tidak ditemukan di dalam berkas backup.`);
  }
  const isGroup = chatId.endsWith('@g.us');
  const isChannel = chatId.endsWith('@newsletter');
  const isDirect = chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid');

  let chatName = null;
  if (chatId.includes('260593114161297')) {
    chatName = 'Catatan / Nomor Pribadi (+62 895-7074-91166)';
  } else if (isDirect && chatId.endsWith('@s.whatsapp.net')) {
    chatName = formatPhoneNumber(chatId);
  } else if (chatId.endsWith('@lid')) {
    chatName = `Kontak Pribadi (LID ${chatId.split('@')[0].slice(-4)})`;
  } else {
    chatName = chatId;
  }

  const links = [];
  const media = [];
  const participantStats = {};

  messages.forEach((m, idx) => {
    if (['image', 'video', 'audio', 'document', 'sticker'].includes(m.type) || m.mediaInfo) {
      media.push({
        id: m.id || `media-${idx}`,
        type: m.type,
        caption: m.text || '',
        mediaInfo: m.mediaInfo || {},
        timestamp: m.timestamp,
        date: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
        fromMe: m.fromMe,
        sender: m.pushName || (m.fromMe ? 'Saya / Bot' : formatPhoneNumber(m.participant || m.from)),
      });
    }

    if (m.text) {
      const urls = extractUrls(m.text);
      urls.forEach(url => {
        links.push({
          url,
          context: m.text,
          timestamp: m.timestamp,
          date: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
          fromMe: m.fromMe,
          sender: m.pushName || (m.fromMe ? 'Saya / Bot' : formatPhoneNumber(m.participant || m.from)),
        });
      });
    }

    const pJid = m.participant || (!m.fromMe ? m.from : null);
    if (pJid) {
      if (!participantStats[pJid]) {
        participantStats[pJid] = {
          jid: pJid,
          phone: formatPhoneNumber(pJid),
          raw_phone: pJid.split('@')[0],
          name: m.pushName || formatPhoneNumber(pJid),
          message_count: 0,
        };
      }
      participantStats[pJid].message_count++;
    }
  });

  return {
    id: chatId,
    name: chatName,
    phone: isDirect ? formatPhoneNumber(chatId) : null,
    raw_phone: isDirect ? chatId.split('@')[0] : null,
    type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
    is_group: isGroup,
    is_channel: isChannel,
    is_direct: isDirect,
    messages,
    links,
    media,
    participants: Object.values(participantStats).sort((a, b) => b.message_count - a.message_count),
    total_messages: messages.length,
    total_links: links.length,
    total_media: media.length,
  };
}

export default {
  handleMessagesUpsert,
  handleHistorySync,
  handleContactsUpsert,
  handleChatsUpsert,
  handlePhoneNumberShare,
  resolveLidToPhone,
  harvestGroupContacts,
  saveMessages,
  saveContacts,
  saveChats,
  getContacts,
  getStoredChats,
  getAllMessages,
  getMessageStats,
  readChatMessages,
  getChatSummaries,
  getChatDetail,
  listBackupZips,
  inspectBackupZip,
  getBackupZipChat,
  extractUrls,
  formatPhoneNumber,
};


