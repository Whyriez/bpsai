import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createReconnectScheduler, describeDisconnect, describeOutgoingStatus, describeOutgoingReceipt } from '../src/services/connectionDiagnostics.js';
import { metadataCache, fetchParticipatingGroups } from '../src/services/whatsappMetadataCache.js';

// Execute the real server module with mocked auth, filesystem, HTTP and WhatsApp.
// No credential directory is read and no network connection is made.
async function fixture() {
  const sockets = [];
  const timers = new Map();
  const handlers = new Map();
  const logs = [];
  let timerId = 0;
  let deletes = 0;
  let savedCreds = 0;
  let lookups = 0;
  const setTimer = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; };
  const clearTimer = (id) => timers.delete(id);
  const phone = '628111111111';
  const state = { creds: { registered: true, me: { id: `${phone}:2@s.whatsapp.net` } }, keys: {} };
  const protocol = [2, 3000, 1234567890];
  const addRoute = (paths, fn) => {
    for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(path, fn);
  };
  const app = { use() {}, all: addRoute, get: addRoute, post: addRoute, listen(port, fn) { fn(); } };
  const express = Object.assign(() => app, { json: () => {}, urlencoded: () => {}, static: () => {} });
  const store = {
    readChatMessages: () => [], getSessionInfo: () => ({ phone }), saveSessionInfo() {}, setMyJid() {},
    isSelfJid: (jid) => jid === `${phone}@s.whatsapp.net`,
    createSafetyBackup() { throw new Error('Unexpected backup in a transient disconnect'); },
    clearLiveStore() { throw new Error('Unexpected live-store deletion'); },
  };
  const liveChat = { setSocketGetter() {} };
  const fakeFs = { existsSync: () => true, rmSync() { deletes++; }, mkdirSync() {} };
  const makeSocket = (config) => {
    const events = new Map();
    const originalSend = async () => ({ key: { id: 'fixture' } });
    const socket = {
      config, user: state.creds.me, sendMessage: originalSend, originalSend, endCalls: 0,
      ev: { on(name, fn) { events.set(name, [...(events.get(name) || []), fn]); } },
      async emit(name, data) { await Promise.all((events.get(name) || []).map((fn) => fn(data))); },
      end() { this.endCalls++; this.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 428 } } } }); },
    };
    sockets.push(socket);
    return socket;
  };
  const mocks = {
    '@whiskeysockets/baileys': {
      default: makeSocket, DisconnectReason: { loggedOut: 401 },
      useMultiFileAuthState: async () => ({ state, saveCreds: async () => { savedCreds++; } }),
      fetchLatestBaileysVersion: async () => { lookups++; return { version: protocol, isLatest: true }; },
      makeCacheableSignalKeyStore: (keys) => keys,
      proto: { Message: { fromObject: () => ({}) } },
    },
    'node-cache': {
      default: class {
        constructor() { this.map = new Map(); }
        get(k) { return this.map.get(k); }
        set(k, v) { this.map.set(k, v); }
        del(k) { this.map.delete(k); }
        has(k) { return this.map.has(k); }
      }
    },
    '@whiskeysockets/baileys/lib/Socket/mex.js': { executeWMexQuery() {} },
    express: { default: express },
    fs: { default: fakeFs },
    pino: { default: () => ({}) },
    qrcode: { default: { toDataURL: async () => 'fixture' } },
    'qrcode-terminal': { default: { generate() {} } },
    './src/routes/backupRoute.js': { default: {}, setBackupService() {} },
    './src/routes/chatExplorerRoute.js': { default: {}, setExplorerSocketGetter() {} },
    './src/services/whatsappBackupService.js': { createBackupService: () => ({}) },
    './src/store/messageStore.js': { default: store },
    './src/services/liveChatSessionService.js': { default: liveChat },
    './src/services/connectionDiagnostics.js': {
      createReconnectScheduler: (reconnect) => createReconnectScheduler(reconnect, { setTimer, clearTimer }),
      describeDisconnect, describeOutgoingStatus, describeOutgoingReceipt,
    },
    './src/services/whatsappMetadataCache.js': { metadataCache, fetchParticipatingGroups },
  };
  const context = vm.createContext({
    console: Object.fromEntries(['log', 'warn', 'error'].map((name) => [name, (...args) => logs.push(args)])),
    process: { env: {} },
    setTimeout: setTimer,
    clearTimeout: clearTimer,
  });
  const serverUrl = new URL('../server.js', import.meta.url);
  const module = new vm.SourceTextModule(fs.readFileSync(serverUrl, 'utf8'), {
    context, identifier: serverUrl.href, initializeImportMeta(meta) { meta.url = serverUrl.href; },
  });
  await module.link(async (specifier) => {
    const exports = mocks[specifier] || await import(specifier);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  const flush = () => new Promise(setImmediate);
  await flush();
  const runRetry = async () => {
    const [id, timer] = [...timers.entries()].find(([, item]) => item.delay !== 2500);
    timers.delete(id); timer.fn(); await flush();
  };
  const status = () => {
    let result;
    handlers.get('/status')({}, { json(value) { result = value; } });
    return result;
  };
  return { sockets, state, protocol, timers, runRetry, status, logs,
    counts: () => ({ deletes, savedCreds, lookups }) };
}

test('startup restores version lookup, original auth/browser and unwrapped sending', async () => {
  const env = await fixture();
  assert.equal(env.sockets.length, 1);
  const socket = env.sockets[0];
  assert.equal(socket.config.auth.creds, env.state.creds);
  assert.equal(socket.config.auth.keys, env.state.keys);
  assert.equal(socket.config.version, env.protocol);
  assert.deepEqual(Array.from(socket.config.browser), ['SIGAP BPS Gateway', 'Chrome', '1.0.0']);
  assert.equal(socket.sendMessage, socket.originalSend);
  assert.equal(env.counts().lookups, 1);
  assert.equal(env.status().runtime.baileys_version, '6.7.24');
});

test('428 retains credentials/history, reconnects once and ignores an old socket', async () => {
  const env = await fixture();
  const closed = { connection: 'close', lastDisconnect: {
    error: { message: 'Connection Terminated', output: { statusCode: 428 }, cause: { code: 'ECONNRESET', message: 'socket reset' } },
  } };
  await env.sockets[0].emit('connection.update', closed);
  assert.equal(env.status().last_disconnect.statusCode, 428);
  assert.equal(env.status().last_disconnect.message, 'Connection Terminated');
  assert.equal(env.status().last_disconnect.causeCode, 'ECONNRESET');
  assert.equal([...env.timers.values()][0].delay, 5000);
  assert.equal(env.counts().deletes, 0);
  await env.runRetry();
  assert.equal(env.sockets.length, 2);
  assert.equal(env.sockets[0].endCalls, 1);
  assert.equal(env.timers.size, 0);
  await env.sockets[0].emit('connection.update', { connection: 'open' });
  await env.sockets[0].emit('creds.update', {});
  assert.equal(env.status().is_connected, false);
  assert.equal(env.counts().savedCreds, 0);
  await env.sockets[1].emit('connection.update', closed);
  assert.equal([...env.timers.values()][0].delay, 10000);
  await env.runRetry();
  await env.sockets[2].emit('connection.update', { connection: 'open' });
  assert.equal(env.status().is_connected, true);
  assert.equal(env.status().last_disconnect, null);
  await env.sockets[2].emit('creds.update', {});
  assert.equal(env.counts().savedCreds, 1);
  await env.sockets[2].emit('connection.update', closed);
  assert.ok([...env.timers.values()].some((timer) => timer.delay === 5000));
  assert.equal(env.counts().deletes, 0);
});

test('disconnect diagnostics omit raw auth state and payloads', () => {
  const details = describeDisconnect({ output: { statusCode: 428 }, message: 'closed', creds: 'secret', data: { keys: 'secret' } });
  assert.equal(JSON.stringify(details).includes('secret'), false);
  assert.equal(details.loggedOut, false);
  assert.equal(describeDisconnect({ output: { statusCode: 401 } }).loggedOut, true);
});

test('outgoing acknowledgement diagnostics preserve errors and omit content', async () => {
  const env = await fixture();
  const key = { remoteJid: '628222222222@s.whatsapp.net', fromMe: true, id: 'test-message' };
  await env.sockets[0].emit('messages.update', [{ key, update: { status: 2, message: { conversation: 'Private text' } } }]);
  assert.equal(env.status().recent_outgoing_statuses.at(-1).status, 'SERVER_ACK');
  assert.equal(env.status().recent_outgoing_statuses.length, 1);
  await env.sockets[0].emit('messages.update', [{ key, update: { status: 2 } }]);
  assert.equal(env.status().recent_outgoing_statuses.length, 1);
  await env.sockets[0].emit('messages.update', [{ key, update: { status: 0, messageStubParameters: ['479'] } }]);
  const last = env.status().recent_outgoing_statuses.at(-1);
  assert.equal(last.status, 'ERROR');
  assert.equal(last.error_code, '479');
  assert.equal(JSON.stringify(env.status().recent_outgoing_statuses).includes('Private text'), false);
  const count = env.status().recent_outgoing_statuses.length;
  await env.sockets[0].emit('messages.update', [
    { key: { ...key, fromMe: false }, update: { status: 4 } },
    { key: { ...key, remoteJid: '628111111111@s.whatsapp.net' }, update: { status: 3 } },
  ]);
  assert.equal(env.status().recent_outgoing_statuses.length, count);
});

test('delivery/read events differ from server acceptance, and groups identify the recipient', () => {
  const key = { fromMe: true, id: 'group-message', remoteJid: '123@g.us' };
  assert.equal(describeOutgoingStatus({ key, update: { status: 3 } }).status, 'DELIVERY_ACK');
  assert.equal(describeOutgoingStatus({ key, update: { status: 4 } }).status, 'READ');
  const receipt = describeOutgoingReceipt({ key, receipt: { userJid: 'person@lid', receiptTimestamp: 100 } });
  assert.equal(receipt.status, 'DELIVERY_ACK');
  assert.equal(receipt.recipient_id, 'person@lid');
  assert.equal(describeOutgoingStatus({ key, update: { status: 7 } }), null);
  assert.equal(describeOutgoingReceipt({ key, receipt: { userJid: 'person@lid' } }), null);
});

test('reconnect scheduler keeps one timer and caps backoff', () => {
  const timers = new Map();
  let id = 0;
  const scheduler = createReconnectScheduler(() => {}, {
    setTimer(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimer(key) { timers.delete(key); },
  });
  for (let i = 0; i < 20; i++) scheduler.schedule();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 60000);
  scheduler.reset();
  assert.equal(timers.size, 0);
  assert.equal(scheduler.schedule(), 5000);
});
