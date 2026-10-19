// messageStore.js — Persistent message storage for WhatsApp backup
// Stores messages per-chat as JSON files in wa-gateway/data/messages/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory: wa-gateway/data/messages/ and wa-gateway/data/media/
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'messages');
const CONTACTS_FILE = path.join(__dirname, '..', '..', 'data', 'contacts.json');
const CHATS_FILE = path.join(__dirname, '..', '..', 'data', 'chats.json');
const MEDIA_DIR = path.join(__dirname, '..', '..', 'data', 'media');
const LID_MAP_FILE = path.join(__dirname, '..', '..', 'data', 'lid_map.json');
const SESSION_INFO_FILE = path.join(__dirname, '..', '..', 'data', 'session_info.json');

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
  map[jid] = lid; // bidirectional mapping
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
      if (map[lidOrJid] && map[lidOrJid].endsWith('@s.whatsapp.net')) return map[lidOrJid];
    }
  } catch (e) {}
  return lidOrJid;
}

function resolvePhoneToLid(phoneJid) {
  if (!phoneJid) return null;
  try {
    if (fs.existsSync(LID_MAP_FILE)) {
      const map = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
      if (map[phoneJid] && map[phoneJid].endsWith('@lid')) return map[phoneJid];
    }
  } catch (e) {}
  return null;
}

let myJids = new Set();
function loadMyJids() {
  try {
    const credsFile = path.join(__dirname, '..', '..', 'auth_info_baileys', 'creds.json');
    if (fs.existsSync(credsFile)) {
      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
      if (creds.me) {
        if (creds.me.id) {
          myJids.add(creds.me.id);
          myJids.add(creds.me.id.split(':')[0] + '@s.whatsapp.net');
        }
        if (creds.me.lid) {
          myJids.add(creds.me.lid);
          myJids.add(creds.me.lid.split(':')[0] + '@lid');
        }
      }
    }
  } catch (e) {}
}
loadMyJids();

function setMyJid(id, lid) {
  if (id) {
    myJids.add(id);
    myJids.add(id.split(':')[0] + '@s.whatsapp.net');
  }
  if (lid) {
    myJids.add(lid);
    myJids.add(lid.split(':')[0] + '@lid');
  }
}

function isSelfJid(jid) {
  if (!jid) return false;
  loadMyJids();
  const clean = jid.split(':')[0] + (jid.includes('@') ? '@' + jid.split('@')[1] : '');
  if (myJids.has(jid) || myJids.has(clean)) return true;
  if (jid.includes('116939829588032')) return true; // current bot LID
  if (jid.includes('260593114161297')) return true; // old self note
  return false;
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
  if (!content) return null;

  // NEVER save internal WhatsApp protocol messages (sync stubs, encryption keys, receipts)
  if (content.protocolMessage) {
    return null;
  }

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
  } else {
    // Try to find any text-like content
    const keys = Object.keys(content);
    if (keys.length > 0) {
      type = keys[0].replace('Message', '');
      text = content[keys[0]]?.caption || content[keys[0]]?.text || '';
    }
  }

  // Ignore empty unknown messages (which are internal WhatsApp sync packets)
  if (type === 'unknown' && !text && !mediaInfo) {
    return null;
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

  // Extract quoted context if present
  let quoted = null;
  const contextInfo =
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.audioMessage?.contextInfo ||
    content.documentMessage?.contextInfo ||
    content.stickerMessage?.contextInfo ||
    msg.message?.extendedTextMessage?.contextInfo ||
    content.contextInfo;

  if (contextInfo?.quotedMessage || contextInfo?.stanzaId) {
    const qContent = unwrapMessage({ message: contextInfo.quotedMessage }) || {};
    const qText =
      qContent.conversation ||
      qContent.extendedTextMessage?.text ||
      qContent.imageMessage?.caption ||
      qContent.videoMessage?.caption ||
      qContent.documentMessage?.fileName ||
      qContent.documentMessage?.caption ||
      (qContent.imageMessage ? '[Foto / Gambar]' : null) ||
      (qContent.videoMessage ? '[Video]' : null) ||
      (qContent.audioMessage ? '[Pesan Suara]' : null) ||
      (qContent.documentMessage ? '[Dokumen]' : null) ||
      '';

    const qParticipant = contextInfo.participant || null;
    quoted = {
      id: contextInfo.stanzaId || null,
      participant: qParticipant,
      text: qText,
      sender: qParticipant ? formatPhoneNumber(qParticipant) : null,
    };
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
    quoted,
  };
}

/**
 * Save new messages for a given chat (append, dedup by ID).
 */
function saveMessages(chatId, rawMessages) {
  if (!chatId || !rawMessages || rawMessages.length === 0) return 0;

  // Resolve to canonical chat ID (LID -> Phone JID)
  const canonicalChatId = resolveLidToPhone(chatId);

  // Skip if it's the bot's own internal multi-device sync partner
  if (isSelfJid(chatId) || isSelfJid(canonicalChatId)) {
    return 0;
  }

  const existing = readChatMessages(canonicalChatId);
  const existingIds = new Set(existing.map(m => m.id));

  let added = 0;
  for (const msg of rawMessages) {
    const extracted = extractMessageData(msg);
    if (!extracted || !extracted.id) continue;
    if (extracted.type === 'protocol') continue;
    if (extracted.type === 'unknown' && !extracted.text && !extracted.mediaInfo) continue;

    if (!existingIds.has(extracted.id)) {
      existing.push(extracted);
      existingIds.add(extracted.id);
      added++;
    }
  }

  if (added > 0) {
    // Sort by timestamp
    existing.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    writeChatMessages(canonicalChatId, existing);
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
    if (!chatId || chatId === 'status@broadcast' || chatId.endsWith('@broadcast')) continue;

    // If incoming from LID and senderPn exists, register mapping immediately
    if (chatId.endsWith('@lid') && msg.key?.senderPn) {
      handlePhoneNumberShare({ lid: chatId, jid: msg.key.senderPn });
    }

    // Canonicalize to phone JID if mapped
    const targetChatId = resolveLidToPhone(chatId);

    // Skip bot's own internal sync
    if (isSelfJid(chatId) || isSelfJid(targetChatId)) continue;

    // Automatically record sender's pushName as contact
    if (msg.pushName && !targetChatId.endsWith('@g.us') && !targetChatId.endsWith('@newsletter')) {
      saveContacts([{
        id: targetChatId,
        name: msg.pushName,
        notify: msg.pushName,
      }]);
    }

    if (!byChatId[targetChatId]) byChatId[targetChatId] = [];
    byChatId[targetChatId].push(msg);
  }

  let totalAdded = 0;
  for (const [cId, msgs] of Object.entries(byChatId)) {
    totalAdded += saveMessages(cId, msgs) || 0;
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
  const str = String(jid);
  if (str.includes('260593114161297')) {
    return '+62 895-7074-91166 (Nomor Anda)';
  }
  const num = (str.includes('@') ? str.split('@')[0] : str).replace(/[^\d]/g, '');
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
  const summariesMap = new Map();

  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const fp = path.join(DATA_DIR, file);
      try {
        const rawChatId = file.replace('.json', '');
        
        // Skip bot's own self JID or LID (internal multi-device sync)
        if (isSelfJid(rawChatId)) continue;

        const messages = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (!Array.isArray(messages) || messages.length === 0) continue;

        // Filter: Must have at least one real user message (not protocol, not empty unknown)
        const realMessages = messages.filter(m => m && m.type !== 'protocol' && (Boolean(m.text?.trim()) || Boolean(m.mediaInfo) || ['image', 'video', 'audio', 'document', 'sticker', 'contact', 'location'].includes(m.type)));
        if (realMessages.length === 0) {
          continue; // Skip ghost chat!
        }

        const canonicalId = resolveLidToPhone(rawChatId);
        if (isSelfJid(canonicalId)) continue;

        const isGroup = canonicalId.endsWith('@g.us');
        const isChannel = canonicalId.endsWith('@newsletter');
        const isDirect = canonicalId.endsWith('@s.whatsapp.net') || canonicalId.endsWith('@lid');

        // Determine best display name
        let name = null;
        if (contacts[canonicalId]?.name && contacts[canonicalId]?.name !== canonicalId) {
          name = contacts[canonicalId].name;
        } else if (contacts[rawChatId]?.name && contacts[rawChatId]?.name !== rawChatId) {
          name = contacts[rawChatId].name;
        } else {
          for (let i = realMessages.length - 1; i >= 0; i--) {
            if (!realMessages[i].fromMe && realMessages[i].pushName) {
              name = realMessages[i].pushName;
              break;
            }
          }
        }

        if (!name || name === canonicalId || name === rawChatId) {
          if (isDirect && canonicalId.endsWith('@s.whatsapp.net')) {
            name = formatPhoneNumber(canonicalId);
          } else if (isGroup) {
            name = `Grup (${canonicalId.split('@')[0].slice(-6)})`;
          } else if (isChannel) {
            name = `Saluran (${canonicalId.split('@')[0].slice(-6)})`;
          } else {
            name = canonicalId.endsWith('@lid') ? `Kontak Pribadi (LID ${canonicalId.split('@')[0].slice(-4)})` : canonicalId;
          }
        }

        const lastMsg = realMessages[realMessages.length - 1];

        // Count media and links
        let mediaCount = 0;
        let linkCount = 0;
        const participantMap = {};

        for (const m of realMessages) {
          if (['image', 'video', 'audio', 'document', 'sticker'].includes(m.type)) {
            mediaCount++;
          }
          if (m.text && extractUrls(m.text).length > 0) {
            linkCount++;
          }
          const senderJid = m.participant || (!m.fromMe ? (m.from || canonicalId) : null);
          if (senderJid && !participantMap[senderJid]) {
            participantMap[senderJid] = {
              jid: senderJid,
              phone: formatPhoneNumber(senderJid),
              name: m.pushName || contacts[senderJid]?.name || formatPhoneNumber(senderJid),
            };
          }
        }

        const summaryItem = {
          id: canonicalId,
          lid: rawChatId.endsWith('@lid') ? rawChatId : resolvePhoneToLid(canonicalId),
          name,
          phone: isDirect ? formatPhoneNumber(canonicalId) : null,
          raw_phone: isDirect ? canonicalId.split('@')[0] : null,
          type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
          is_group: isGroup,
          is_channel: isChannel,
          is_direct: isDirect,
          message_count: realMessages.length,
          media_count: mediaCount,
          link_count: linkCount,
          participant_count: Object.keys(participantMap).length || 1,
          participants: Object.values(participantMap),
          last_message: {
            text: lastMsg.text || (lastMsg.type !== 'text' ? `[${lastMsg.type}]` : ''),
            type: lastMsg.type,
            timestamp: lastMsg.timestamp,
            date: lastMsg.timestamp ? new Date(lastMsg.timestamp * 1000).toISOString() : null,
            fromMe: lastMsg.fromMe,
            sender: lastMsg.pushName || (lastMsg.fromMe ? 'Saya / Bot' : null),
          },
        };

        // If canonicalId already exists in summariesMap (e.g. merging LID and phone number), merge them!
        if (summariesMap.has(canonicalId)) {
          const existing = summariesMap.get(canonicalId);
          existing.message_count += summaryItem.message_count;
          existing.media_count += summaryItem.media_count;
          existing.link_count += summaryItem.link_count;
          if ((summaryItem.last_message?.timestamp || 0) > (existing.last_message?.timestamp || 0)) {
            existing.last_message = summaryItem.last_message;
          }
          if (summaryItem.name && !summaryItem.name.startsWith('+') && existing.name.startsWith('+')) {
            existing.name = summaryItem.name;
          }
        } else {
          summariesMap.set(canonicalId, summaryItem);
        }
      } catch (err) {
        console.warn(`⚠️ [MessageStore] Error summarizing ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ [MessageStore] Error reading summaries:', err);
  }

  const summaries = Array.from(summariesMap.values());

  // Sort descending by newest message timestamp
  summaries.sort((a, b) => {
    const tsA = a.last_message?.timestamp || 0;
    const tsB = b.last_message?.timestamp || 0;
    return tsB - tsA;
  });

  return summaries;
}

/**
 * Get full chat details including parsed messages, links, media, and participants.
 * Automatically merges messages from both Phone JID and LID for seamless viewing.
 */
function getChatDetail(chatId) {
  ensureDir();
  const contacts = getContacts();

  // Resolve to canonical and associated IDs (Phone JID and LID)
  const canonicalId = resolveLidToPhone(chatId);
  const associatedIds = new Set([chatId, canonicalId]);
  const mappedLid = resolvePhoneToLid(canonicalId);
  if (mappedLid) associatedIds.add(mappedLid);

  // Read messages across all associated IDs and merge
  const allMessages = [];
  const seenIds = new Set();
  for (const cId of associatedIds) {
    const msgs = readChatMessages(cId);
    for (const m of msgs) {
      if (!m || !m.id || seenIds.has(m.id)) continue;
      if (m.type === 'protocol') continue;
      if (m.type === 'unknown' && !m.text && !m.mediaInfo) continue;
      seenIds.add(m.id);
      allMessages.push(m);
    }
  }

  allMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const isGroup = canonicalId.endsWith('@g.us');
  const isChannel = canonicalId.endsWith('@newsletter');
  const isDirect = canonicalId.endsWith('@s.whatsapp.net') || canonicalId.endsWith('@lid');

  let chatName = contacts[canonicalId]?.name || contacts[chatId]?.name || null;
  if (!chatName) {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (!allMessages[i].fromMe && allMessages[i].pushName) {
        chatName = allMessages[i].pushName;
        break;
      }
    }
  }
  if (!chatName || chatName === canonicalId) {
    chatName = isDirect ? formatPhoneNumber(canonicalId) : canonicalId;
  }

  // If no stored messages yet but contact exists or is direct chat, return clean contact view
  if (allMessages.length === 0 && (contacts[canonicalId] || contacts[chatId] || isDirect)) {
    const phone = formatPhoneNumber(canonicalId);
    return {
      id: canonicalId,
      lid: mappedLid || (chatId.endsWith('@lid') ? chatId : null),
      name: chatName || phone,
      phone: isDirect ? phone : null,
      raw_phone: isDirect ? canonicalId.split('@')[0] : null,
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
      participants: [{ jid: canonicalId, phone, name: chatName || phone, message_count: 0 }],
      total_messages: 0,
      total_links: 0,
      total_media: 0,
    };
  }

  const links = [];
  const media = [];
  const participantStats = {};

  allMessages.forEach((m, idx) => {
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
    const pJid = m.participant || (!m.fromMe ? (m.from || canonicalId) : null);
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

  const phone = isDirect ? formatPhoneNumber(canonicalId) : null;
  return {
    id: canonicalId,
    lid: mappedLid || (chatId.endsWith('@lid') ? chatId : null),
    name: chatName || phone,
    phone,
    raw_phone: isDirect ? canonicalId.split('@')[0] : null,
    type: isGroup ? 'group' : (isChannel ? 'channel' : 'direct'),
    is_group: isGroup,
    is_channel: isChannel,
    is_direct: isDirect,
    messages: allMessages,
    links,
    media,
    participants: Object.values(participantStats).sort((a, b) => b.message_count - a.message_count),
    total_messages: allMessages.length,
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
      let phone = null;
      let totalMessages = 0;
      let totalChats = 0;
      try {
        const zip = new AdmZip(fp);
        const infoEntry = zip.getEntry('backup_info.json');
        if (infoEntry) {
          const info = JSON.parse(infoEntry.getData().toString('utf8'));
          phone = info.phone || null;
          totalMessages = info.summary?.total_messages || 0;
          totalChats = (info.summary?.chats_with_messages || info.summary?.chats) || 0;
        }
      } catch (e) {
        const match = filename.match(/whatsapp_backup_(\d+)_/);
        if (match) phone = match[1];
      }

      return {
        filename,
        path: fp,
        size_bytes: stat.size,
        size_formatted: `${(stat.size / 1024).toFixed(1)} KB`,
        created_at: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
        phone,
        phone_formatted: phone ? formatPhoneNumber(phone) : 'Nomor Tidak Diketahui',
        total_messages: totalMessages,
        total_chats: totalChats,
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
      chat_id: id,
      name,
      chat_name: name,
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

  // 2. contacts.json loop REMOVED intentionally from backup inspect.
  // contacts.json in backup contains ALL contacts ever seen (group members, senders, etc.)
  // Adding them all as "personal chats" causes false inflation of counts.
  // Only chats with actual recorded messages (messageIndex) are legitimate to show here.

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

  const phone = backupInfo?.phone || null;
  return {
    filename: path.basename(zipPath),
    backup_info: backupInfo,
    phone,
    phone_formatted: phone ? formatPhoneNumber(phone) : 'Nomor Tidak Diketahui',
    summary: {
      total_groups: groups.length,
      total_channels: channels.length,
      total_contacts: messageIndex.filter(m => {
        const id = m.chat_id || m.id || '';
        return !id.endsWith('@g.us') && !id.endsWith('@newsletter');
      }).length,
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

/**
 * Completely clears live message storage, chats, contacts, LID maps, and session info.
 * Called when logging out, disconnecting, or changing bot phone number.
 */
function clearLiveStore() {
  ensureDir();
  myJids.clear();
  try {
    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      for (const f of files) {
        if (f.endsWith('.json')) {
          try {
            fs.unlinkSync(path.join(DATA_DIR, f));
          } catch (e) {}
        }
      }
    }

    fs.writeFileSync(CHATS_FILE, JSON.stringify({}, null, 2), 'utf8');
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify({}, null, 2), 'utf8');
    if (fs.existsSync(LID_MAP_FILE)) {
      fs.writeFileSync(LID_MAP_FILE, JSON.stringify({}, null, 2), 'utf8');
    }
    if (fs.existsSync(SESSION_INFO_FILE)) {
      try {
        fs.unlinkSync(SESSION_INFO_FILE);
      } catch (e) {}
    }
    console.log('🧹 [MessageStore] Penyimpanan percakapan live berhasil dikosongkan.');
  } catch (err) {
    console.error('❌ [MessageStore] Gagal membersihkan penyimpanan live:', err.message);
  }
}

/**
 * Creates an automatic safety backup ZIP of the current live data before clearing/resetting.
 * Returns the backup filename or null if no messages existed.
 */
function createSafetyBackup(botPhone = null) {
  try {
    ensureDir();
    const stats = getMessageStats();
    if (!stats || stats.total_messages === 0) {
      console.log('ℹ️ [MessageStore] Tidak ada riwayat pesan yang perlu dicadangkan.');
      return null;
    }

    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safePhone = botPhone ? String(botPhone).replace(/[^\d]/g, '') : 'auto';
    const zipFilename = `whatsapp_backup_${safePhone}_${timestamp}.zip`;
    const zipPath = path.join(backupDir, zipFilename);

    const zip = new AdmZip();

    // 1. Contacts
    const contacts = getContacts();
    if (contacts && Object.keys(contacts).length > 0) {
      zip.addFile('contacts.json', Buffer.from(JSON.stringify(contacts, null, 2), 'utf8'));
    }

    // 2. Chats
    const chats = getStoredChats();
    if (chats && Object.keys(chats).length > 0) {
      zip.addFile('chats.json', Buffer.from(JSON.stringify(chats, null, 2), 'utf8'));
    }

    // 3. Messages
    const allMsgs = getAllMessages();
    const messageIndex = [];
    for (const [chatId, messages] of Object.entries(allMsgs)) {
      if (!messages || messages.length === 0) continue;
      const safeId = sanitizeId(chatId);
      const filename = `messages/${safeId}.json`;
      let chatName = contacts[chatId]?.name || chatId;
      if (!chatName || chatName === chatId) {
        const first = messages.find(m => !m.fromMe && m.pushName);
        if (first) chatName = first.pushName;
      }

      messageIndex.push({
        chat_id: chatId,
        chat_name: chatName,
        message_count: messages.length,
        file: filename,
        oldest: messages[0]?.timestamp ? new Date(messages[0].timestamp * 1000).toISOString() : null,
        newest: messages[messages.length - 1]?.timestamp ? new Date(messages[messages.length - 1].timestamp * 1000).toISOString() : null,
      });

      zip.addFile(filename, Buffer.from(JSON.stringify(messages, null, 2), 'utf8'));
    }

    messageIndex.sort((a, b) => b.message_count - a.message_count);
    zip.addFile('messages/_index.json', Buffer.from(JSON.stringify(messageIndex, null, 2), 'utf8'));

    // 4. Backup Info
    const summary = {
      created_at: new Date().toISOString(),
      phone: botPhone || safePhone,
      auto_backup: true,
      reason: 'session_reset_or_change_number',
      summary: {
        groups: 0,
        channels: 0,
        contacts: Object.keys(contacts || {}).length,
        chats: Object.keys(chats || {}).length,
        chats_with_messages: Object.keys(allMsgs || {}).length,
        total_messages: stats.total_messages,
      }
    };
    zip.addFile('backup_info.json', Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));

    zip.writeZip(zipPath);
    console.log(`🛡️ [MessageStore] Cadangan otomatis berhasil disimpan: ${zipFilename} (${stats.total_messages} pesan)`);
    return zipFilename;
  } catch (err) {
    console.error('❌ [MessageStore] Gagal membuat cadangan otomatis:', err.message);
    return null;
  }
}

function getSessionInfo() {
  try {
    if (fs.existsSync(SESSION_INFO_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_INFO_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveSessionInfo(data) {
  try {
    ensureDir();
    fs.writeFileSync(SESSION_INFO_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

export default {
  handleMessagesUpsert,
  handleHistorySync,
  handleContactsUpsert,
  handleChatsUpsert,
  handlePhoneNumberShare,
  resolveLidToPhone,
  resolvePhoneToLid,
  isSelfJid,
  setMyJid,
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
  clearLiveStore,
  createSafetyBackup,
  getSessionInfo,
  saveSessionInfo,
};


