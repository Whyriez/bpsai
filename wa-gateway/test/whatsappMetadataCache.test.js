import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMetadataCache } from '../src/services/whatsappMetadataCache.js';

test('many overlapping poll requests share one WhatsApp metadata request', async () => {
  const cache = createMetadataCache();
  const socket = {};
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const load = async () => { calls++; await gate; return [{ id: 'channel@newsletter' }]; };
  const pending = Array.from({ length: 50 }, () => cache.get(socket, 'newsletters', load));
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  const values = await Promise.all(pending);
  assert.ok(values.every((value) => value === values[0]));
});

test('an empty result is cached and refreshes only after expiry', async () => {
  let time = 0;
  let calls = 0;
  const cache = createMetadataCache({ now: () => time });
  const socket = {};
  const load = async () => { calls++; return []; };
  for (let i = 0; i < 20; i++) await cache.get(socket, 'newsletters', load, { ttlMs: 300000 });
  assert.equal(calls, 1);
  time = 300000;
  await cache.get(socket, 'newsletters', load, { ttlMs: 300000 });
  assert.equal(calls, 2);
});

test('a rate limit on the first call prevents repeated requests for five minutes', async () => {
  let time = 0;
  let calls = 0;
  let warnings = 0;
  const cache = createMetadataCache({ now: () => time });
  const socket = {};
  const load = () => { calls++; throw new Error('rate-overlimit'); };
  const options = { fallback: [], onError: () => { warnings++; } };
  for (let i = 0; i < 50; i++) assert.deepEqual(await cache.get(socket, 'newsletters', load, options), []);
  assert.equal(calls, 1);
  assert.equal(warnings, 1);
  time = 299999;
  await cache.get(socket, 'newsletters', load, options);
  assert.equal(calls, 1);
  time++;
  await cache.get(socket, 'newsletters', load, options);
  assert.equal(calls, 2);
});

test('metadata remains available during an outage and recovers after backoff', async () => {
  let time = 0;
  let fail = false;
  const cache = createMetadataCache({ now: () => time });
  const socket = {};
  const load = async () => { if (fail) throw new Error('Connection Closed'); return { group: 'Tersedia' }; };
  const previous = await cache.get(socket, 'groups', load);
  time = 60000;
  fail = true;
  assert.equal(await cache.get(socket, 'groups', load), previous);
  time += 60000;
  fail = false;
  assert.notEqual(await cache.get(socket, 'groups', load), previous);
});

test('a reconnect or changed linked account cannot reuse another account metadata', async () => {
  const cache = createMetadataCache();
  const socket = { user: { id: 'first@s.whatsapp.net' } };
  assert.equal(await cache.get(socket, 'groups', async () => 'first'), 'first');
  const reconnected = { user: { id: 'first@s.whatsapp.net' } };
  assert.equal(await cache.get(reconnected, 'groups', async () => 'reconnected'), 'reconnected');
  socket.user.id = 'second@s.whatsapp.net';
  assert.equal(await cache.get(socket, 'groups', async () => 'second'), 'second');
});

test('groups and individual group metadata expire independently', async () => {
  const cache = createMetadataCache();
  const socket = {};
  assert.equal(await cache.get(socket, 'groups', async () => 'list'), 'list');
  assert.equal(await cache.get(socket, 'group:one@g.us', async () => 'one'), 'one');
  assert.equal(await cache.get(socket, 'group:two@g.us', async () => 'two'), 'two');
});
