const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

// All API traffic is mocked. This script never sends a real WhatsApp message.
// Run with the Vite server at EXPLORER_URL (default http://127.0.0.1:5176).
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('access_token', 'local-fixture'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const chatId = '628111111111@s.whatsapp.net';
  const secondId = '628222222222@s.whatsapp.net';
  const timestamp = Math.floor(Date.now() / 1000) - 120;
  const message = (id, text, fromMe = false, ts = timestamp) => ({ id, text, fromMe, timestamp: ts, type: 'text', pushName: 'Pengunjung' });
  let messages = Array.from({ length: 35 }, (_, i) => message(`m${i}`, `Pesan riwayat nomor ${i + 1}`, false, timestamp + i));
  let secondMessages = [message('second', 'Percakapan kedua')];
  let connected = true;
  let emptyList = false;
  let phone = '628999999999';
  let failList = false;
  let hold = null;
  let heldReady = null;
  let releaseHeld = null;
  let slowNext = false;
  let detailCalls = 0;
  let detailActive = 0;
  let maxDetailActive = 0;
  const chat = (id, name, items) => ({ id, name, is_direct: true, type: 'direct', raw_phone: id.split('@')[0], phone: id.split('@')[0],
    messages: items, total_messages: items.length, message_count: items.length, last_message: items.at(-1),
    session_status: 'admin_active', participants: [], media: [], links: [], visitor_data: null });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = decodeURIComponent(url.pathname);
    let body = { success: true };
    if (path.endsWith('/sessions-settings')) body.settings = { autoGreetingEnabled: true };
    else if (path.endsWith('/backups')) body.backups = [];
    else if (path.endsWith('/reply')) {
      const data = route.request().postDataJSON();
      const sent = message('out-fixture', data.message, true, timestamp + 60);
      messages.push(sent);
      body = { success: true, message_id: sent.id };
    } else if (path.endsWith('/chats')) {
      if (failList) return route.fulfill({ status: 503, json: { error: 'Gateway fixture unavailable' } });
      body = { success: true, is_connected: connected, status: connected ? 'CONNECTED' : 'DISCONNECTED', phone: connected ? phone : null,
        stats: { total_messages: messages.length + secondMessages.length }, chats: !connected || emptyList ? [] : [chat(chatId, 'Pengunjung Utama', messages), chat(secondId, 'Pengunjung Kedua', secondMessages)] };
    } else if (path.includes('/chats/')) {
      detailCalls++;
      detailActive++;
      maxDetailActive = Math.max(maxDetailActive, detailActive);
      const id = path.split('/chats/')[1];
      body.chat = structuredClone(id === secondId ? chat(secondId, 'Pengunjung Kedua', secondMessages) : chat(chatId, 'Pengunjung Utama', messages));
      if (slowNext) {
        slowNext = false;
        hold = new Promise((resolve) => { releaseHeld = resolve; });
        heldReady?.();
        await hold;
      }
      detailActive--;
    }
    await route.fulfill({ json: body }).catch(() => {});
  });
  const waitText = async (text) => page.getByText(text, { exact: true }).first().waitFor();
  const sync = () => page.getByTitle('Segarkan daftar & pesan sekarang (Instan)').click();
  const list = page.locator('.wa-chat-list');
  const feed = page.locator('.wa-message-feed');
  try {
    await page.goto(`${process.env.EXPLORER_URL || 'http://127.0.0.1:5176'}/whatsapp-chat`);
    await waitText('Pesan riwayat nomor 35');
    assert.equal(await list.getByText('Pengunjung Utama', { exact: true }).count(), 1);

    // A disconnect and an empty snapshot must retain list, selection and history.
    connected = false;
    await sync();
    await page.getByText(/WhatsApp terputus\. Menunggu/).waitFor();
    assert.equal(await list.getByText('Pengunjung Utama', { exact: true }).count(), 1);
    await waitText('Pesan riwayat nomor 35');
    connected = true;
    emptyList = true;
    await sync();
    assert.equal(await list.getByText('Pengunjung Utama', { exact: true }).count(), 1);
    emptyList = false;

    // Incoming chat appears through polling, while an operator reading history stays put.
    await feed.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
    messages.push(message('incoming', 'Balasan masuk otomatis', false, timestamp + 50));
    await waitText('Balasan masuk otomatis');
    assert.equal(await feed.evaluate((el) => el.scrollTop), 0);
    await page.getByRole('button', { name: 'Pesan baru ↓', exact: true }).click();
    await page.waitForTimeout(500);
    assert.ok(await feed.evaluate((el) => el.scrollTop > 0));

    // Same IDs and count, but changed content, must render too.
    messages[0] = { ...messages[0], text: 'Teks pesan diperbarui' };
    await waitText('Teks pesan diperbarui');

    // Hold a pre-send snapshot. A successful send must survive its eventual response.
    const ready = new Promise((resolve) => { heldReady = resolve; });
    slowNext = true;
    await ready;
    const callsBefore = detailCalls;
    await page.waitForTimeout(2200);
    assert.equal(detailCalls, callsBefore, 'detail polling must not overlap an in-flight request');
    await page.locator('textarea').fill('Balasan admin dari dashboard');
    await page.getByTitle('Kirim pesan melalui WhatsApp Gateway').click();
    await waitText('Balasan admin dari dashboard');
    releaseHeld();
    await page.waitForTimeout(400);
    assert.equal(await feed.getByText('Balasan admin dari dashboard', { exact: true }).count(), 1);
    await page.waitForTimeout(1200);
    assert.equal(await feed.getByText('Balasan admin dari dashboard', { exact: true }).count(), 1);
    assert.equal(maxDetailActive, 1);

    // A late response for A must not replace B.
    const readySwitch = new Promise((resolve) => { heldReady = resolve; });
    slowNext = true;
    await readySwitch;
    await list.getByText('Pengunjung Kedua', { exact: true }).click();
    await waitText('Percakapan kedua');
    releaseHeld();
    await page.waitForTimeout(400);
    assert.equal(await feed.getByText('Percakapan kedua', { exact: true }).count(), 1);
    assert.equal(await feed.getByText('Pesan riwayat nomor 35', { exact: true }).count(), 0);

    // Errors preserve content and manual sync must report failure honestly.
    failList = true;
    await sync();
    await page.getByText('Sinkronisasi belum selesai. Akan dicoba kembali otomatis.').waitFor();
    await waitText('Percakapan kedua');
    failList = false;

    // Responsive header and toolbar: no document overflow and heading precedes actions.
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      const geometry = await page.evaluate(() => {
        const heading = document.querySelector('.wa-contact-heading').getBoundingClientRect();
        const toolbar = document.querySelector('.wa-conversation-actions').getBoundingClientRect();
        const composer = document.querySelector('.wa-composer');
        const send = document.querySelector('button[title="Kirim pesan melalui WhatsApp Gateway"]').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, headingBottom: heading.bottom, toolbarTop: toolbar.top,
          composerWidth: composer.clientWidth, composerScrollWidth: composer.scrollWidth, sendRight: send.right, width: innerWidth };
      });
      assert.equal(geometry.overflow, false, `overflow at ${width}px`);
      assert.ok(geometry.toolbarTop >= geometry.headingBottom, `toolbar overlaps heading at ${width}px`);
      assert.ok(geometry.sendRight <= geometry.width, `send button clipped at ${width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.composerScrollWidth <= geometry.composerWidth + 1, `composer overflows at ${width}px: ${JSON.stringify(geometry)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByTitle('Tampilkan panel data PST, media, dan tautan').click();
    assert.ok(await page.locator('.wa-info-panel').isVisible());
    await page.screenshot({ path: process.env.EXPLORER_SCREENSHOT || 'whatsapp-explorer-desktop.png', fullPage: true });
    await page.getByTitle('Tutup panel info').click();
    await page.screenshot({ path: (process.env.EXPLORER_SCREENSHOT || 'whatsapp-explorer-desktop.png').replace('.png', '-chat.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: (process.env.EXPLORER_SCREENSHOT || 'whatsapp-explorer-desktop.png').replace('.png', '-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Switching sources cancels a pending live response and must keep ZIP isolated.
    const readySource = new Promise((resolve) => { heldReady = resolve; });
    slowNext = true;
    await readySource;
    await page.getByTitle('Telusuri arsip berkas backup ZIP').click();
    await page.getByText('Tidak ada file backup', { exact: true }).waitFor();
    releaseHeld();
    await page.waitForTimeout(400);
    assert.equal(await list.getByText('Pengunjung Kedua', { exact: true }).count(), 0);
    assert.equal(await page.locator('.wa-message-feed').count(), 0);
    await page.getByTitle('Penyimpanan pesan real-time dari WhatsApp Gateway').click();
    await waitText('Balasan admin dari dashboard');

    // Changing the linked phone clears the selected conversation from the old account.
    phone = '628888888888';
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByTitle('Kembali ke daftar obrolan').click();
    await sync();
    assert.equal(await page.locator('.wa-message-feed').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: polling, retained list/history, send race/dedup, chat/source switch, refresh errors, scroll, responsive layout, account switch.');
  } finally {
    releaseHeld?.();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
