import test from 'node:test';
import assert from 'node:assert/strict';
import liveChatSessionService, {
  analyzeIntentLocally,
  handleAdminMessageSent,
  handleIncomingMessage,
  clearSessions,
  getLocalGorontaloDate
} from '../src/services/liveChatSessionService.js';

test('analyzeIntentLocally treats returning user on new day as GREETING_NEW, not continuation', () => {
  const localDate = getLocalGorontaloDate();
  const pastSession = {
    visitorData: { nama: 'Budi' },
    messageCount: 5,
    lastGreetedDate: '2026-10-23', // 3 days ago
    autoGreeted: true,
  };

  const recentMsgs = [
    { text: 'Halo selamat pagi', fromMe: false, timestamp: Math.floor(Date.now() / 1000) }
  ];

  const analysis = analyzeIntentLocally('Halo selamat pagi', recentMsgs, pastSession);
  assert.equal(analysis.intent, 'GREETING_NEW');
  assert.equal(analysis.is_continuation, false);
  assert.equal(analysis.should_skip_opening_greeting, false);
});

test('handleAdminMessageSent ignores @newsletter, @g.us, and @broadcast', () => {
  clearSessions();
  handleAdminMessageSent('120363419771739831@newsletter', 'SIGAP BPS Admin', 'msg-1', 'Informasi Rilis');
  handleAdminMessageSent('120363419771739831@g.us', 'SIGAP BPS Admin', 'msg-2', 'Halo Grup');
  handleAdminMessageSent('status@broadcast', 'SIGAP BPS Admin', 'msg-3', 'Status');

  const sessionNl = liveChatSessionService.getSession('120363419771739831@newsletter');
  const sessionGroup = liveChatSessionService.getSession('120363419771739831@g.us');
  assert.equal(sessionNl, null);
  assert.equal(sessionGroup, null);
});

test('handleIncomingMessage Option 1: sends personalized welcome back to returning user (without blank form)', async () => {
  clearSessions();
  const testJid = '6281234567890@s.whatsapp.net';
  const session = liveChatSessionService.getOrCreateSession(testJid);
  session.lastGreetedDate = '2026-10-23'; // 3 days ago
  session.autoGreeted = true;
  session.visitorData = { nama: 'Ahmad' };
  session.messageCount = 10;

  let sentTo = null;
  let sentPayload = null;
  const mockSock = {
    sendMessage: async (jid, content) => {
      sentTo = jid;
      sentPayload = content;
      return { key: { id: `bot-${Date.now()}` } };
    }
  };

  const incomingMsg = {
    key: { remoteJid: testJid, fromMe: false, id: `test-${Date.now()}` },
    message: { conversation: 'Halo selamat pagi' },
    messageTimestamp: Math.floor(Date.now() / 1000),
  };

  await handleIncomingMessage(mockSock, incomingMsg);
  assert.equal(sentTo, testJid);
  assert.ok(sentPayload?.text);
  // Personalized greeting mentioning name
  assert.ok(sentPayload.text.includes('Selamat datang kembali di Layanan PST BPS'));
  assert.ok(sentPayload.text.includes('Ahmad'));
  // Should NOT demand the form again
  assert.equal(sentPayload.text.includes('Mohon kesediaannya untuk mengisi data berikut'), false);
  
  const updatedSession = liveChatSessionService.getSession(testJid);
  assert.equal(updatedSession.autoGreeted, true);
  assert.equal(updatedSession.status, 'waiting_admin');
});

test('handleIncomingMessage Option 1: sends guest book form to brand new visitor', async () => {
  clearSessions();
  const newJid = '6289988776655@s.whatsapp.net';

  let sentTo = null;
  let sentPayload = null;
  const mockSock = {
    sendMessage: async (jid, content) => {
      sentTo = jid;
      sentPayload = content;
      return { key: { id: `bot-${Date.now()}` } };
    }
  };

  const incomingMsg = {
    key: { remoteJid: newJid, fromMe: false, id: `test-${Date.now()}` },
    message: { conversation: 'Selamat pagi BPS' },
    messageTimestamp: Math.floor(Date.now() / 1000),
  };

  await handleIncomingMessage(mockSock, incomingMsg);
  assert.equal(sentTo, newJid);
  assert.ok(sentPayload?.text);
  // Brand new visitor gets full form
  assert.ok(sentPayload.text.includes('Terima kasih telah menghubungi PST BPS Provinsi Gorontalo'));
  assert.ok(sentPayload.text.includes('Nama :'));
  assert.ok(sentPayload.text.includes('Pekerjaan :'));
  assert.ok(sentPayload.text.includes('Instansi/Asal :'));

  const updatedSession = liveChatSessionService.getSession(newJid);
  assert.equal(updatedSession.autoGreeted, true);
  assert.equal(updatedSession.status, 'waiting_admin');
});
