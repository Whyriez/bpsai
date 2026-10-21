export function describeDisconnect(error) {
  const statusCode = error?.output?.statusCode ?? error?.statusCode ?? null;
  return {
    statusCode,
    message: error?.message || error?.output?.payload?.message || 'Tidak ada detail error',
    causeCode: error?.cause?.code || error?.code || null,
    causeMessage: error?.cause?.message || null,
    streamReason: typeof error?.data?.reason === 'string' ? error.data.reason : null,
    // 428 is a closed transport, not evidence that the user logged out.
    loggedOut: statusCode === 401,
  };
}

const MESSAGE_STATUSES = ['ERROR', 'PENDING', 'SERVER_ACK', 'DELIVERY_ACK', 'READ', 'PLAYED'];

export function describeOutgoingStatus({ key, update } = {}) {
  if (!key?.fromMe || !key.id || !key.remoteJid || !Number.isInteger(update?.status)) return null;
  const status = MESSAGE_STATUSES[update.status];
  if (!status) return null;
  return {
    message_id: key.id,
    chat_id: key.remoteJid,
    status,
    status_code: update.status,
    error_code: update.status === 0 ? String(update.messageStubParameters?.[0] || 'unknown') : null,
  };
}

export function describeOutgoingReceipt({ key, receipt } = {}) {
  if (!key?.fromMe || !key.id || !key.remoteJid || !receipt?.userJid) return null;
  const status = receipt.playedTimestamp ? 5 : receipt.readTimestamp ? 4 : receipt.receiptTimestamp ? 3 : null;
  if (status === null) return null;
  return {
    ...describeOutgoingStatus({ key, update: { status } }),
    // A group receipt confirms this participant only, not the entire group.
    recipient_id: receipt.userJid,
  };
}

export function createReconnectScheduler(reconnect, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let timer = null;
  let attempts = 0;
  const cancel = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  return {
    schedule(overrideDelay) {
      cancel();
      const delay = overrideDelay ?? Math.min(5000 * 2 ** Math.min(attempts, 4), 60000);
      attempts++;
      timer = setTimer(() => { timer = null; reconnect(); }, delay);
      return delay;
    },
    cancel,
    reset() { cancel(); attempts = 0; },
    get attempts() { return attempts; },
  };
}
