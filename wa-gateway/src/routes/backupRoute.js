// backupRoute.js - defines POST /backup endpoint (mounted under /whatsapp)
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// The backup service will be injected from server.js
let _backupService = null;

/**
 * Call this from server.js to inject the backup service instance.
 */
export function setBackupService(service) {
  _backupService = service;
}

// POST /whatsapp/backup
router.post('/backup', async (req, res) => {
  try {
    if (!_backupService) {
      return res.status(503).json({ success: false, error: 'Backup service belum diinisialisasi.' });
    }

    const defaultScope = { groups: true, channels: true, contacts: true, messages: true };
    const scope = { ...defaultScope, ...(req.body.scope || {}) };
    console.log('💾 [Gateway] Menerima permintaan backup WhatsApp...', scope);

    // Gather data from Baileys + message store
    const backupData = await _backupService.gatherBackupData(scope);

    // Create backups directory at wa-gateway root level
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFilename = `whatsapp_backup_${timestamp}.zip`;
    const zipPath = path.join(backupDir, zipFilename);

    // Build ZIP using adm-zip
    const zip = new AdmZip();

    // Groups metadata
    if (backupData.groups && backupData.groups.length > 0) {
      zip.addFile('groups.json', Buffer.from(JSON.stringify(backupData.groups, null, 2), 'utf8'));
    }

    // Channels metadata
    if (backupData.channels && backupData.channels.length > 0) {
      zip.addFile('channels.json', Buffer.from(JSON.stringify(backupData.channels, null, 2), 'utf8'));
    }

    // Contacts
    if (backupData.contacts && Object.keys(backupData.contacts).length > 0) {
      zip.addFile('contacts.json', Buffer.from(JSON.stringify(backupData.contacts, null, 2), 'utf8'));
    }

    // Direct Chats & Conversations List (daftar nomor / obrolan pribadi)
    if (backupData.chats && Object.keys(backupData.chats).length > 0) {
      zip.addFile('chats.json', Buffer.from(JSON.stringify(backupData.chats, null, 2), 'utf8'));
    }

    // Messages — organized per chat in messages/ folder
    const messageIndex = [];
    if (backupData.messages && Object.keys(backupData.messages).length > 0) {
      for (const [chatId, messages] of Object.entries(backupData.messages)) {
        if (!messages || messages.length === 0) continue;

        // Sanitize chatId for filename
        const safeId = chatId.replace(/[<>:"/\\|?*]/g, '_');
        const filename = `messages/${safeId}.json`;

        // Determine chat name from contacts or messages
        let chatName = chatId;
        if (backupData.contacts && backupData.contacts[chatId]) {
          chatName = backupData.contacts[chatId].name || chatId;
        } else {
          // Try to get name from pushName of received messages
          const firstReceived = messages.find(m => !m.fromMe && m.pushName);
          if (firstReceived) chatName = firstReceived.pushName;
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
    }

    // Always include messages/_index.json if messages scope was requested
    if (scope.messages) {
      zip.addFile('messages/_index.json', Buffer.from(JSON.stringify(messageIndex, null, 2), 'utf8'));
    }

    // Full combined backup metadata
    const summary = {
      ...backupData.metadata,
      summary: {
        groups: backupData.groups?.length || 0,
        channels: backupData.channels?.length || 0,
        contacts: Object.keys(backupData.contacts || {}).length,
        chats: Object.keys(backupData.chats || {}).length,
        chats_with_messages: Object.keys(backupData.messages || {}).length,
        total_messages: Object.values(backupData.messages || {}).reduce((s, m) => s + m.length, 0),
      }
    };
    zip.addFile('backup_info.json', Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));

    zip.writeZip(zipPath);

    const downloadUrl = `/backups/${zipFilename}`;
    console.log(`✅ [Gateway] Backup selesai: ${zipPath} — ${summary.summary.total_messages} pesan, ${summary.summary.groups} grup, ${summary.summary.channels} channel`);
    res.json({ success: true, downloadUrl, summary: summary.summary });

  } catch (err) {
    console.error('❌ [Gateway] Backup error:', err);
    res.status(500).json({ success: false, error: err.message || 'Backup gagal' });
  }
});

export default router;
