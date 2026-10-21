export function createMetadataCache({ now = Date.now } = {}) {
  const sockets = new WeakMap();
  return {
    get(socket, key, load, { ttlMs = 60000, fallback = null, onError } = {}) {
      if (!socket) return Promise.resolve(fallback);
      let scope = sockets.get(socket);
      const owner = socket.user?.id || null;
      if (!scope || scope.owner !== owner) {
        scope = { owner, entries: new Map() };
        sockets.set(socket, scope);
      }
      let entry = scope.entries.get(key);
      if (!entry) {
        entry = { value: fallback, expiresAt: 0, pending: null };
        scope.entries.set(key, entry);
      }
      if (entry.pending) return entry.pending;
      if (now() < entry.expiresAt) return Promise.resolve(entry.value);
      entry.pending = Promise.resolve().then(load).then((value) => {
        entry.value = value ?? fallback;
        entry.expiresAt = now() + ttlMs;
        return entry.value;
      }, (error) => {
        // Keep the last successful metadata during an outage. Back off for five
        // minutes on a WhatsApp rate limit, including when the first call fails.
        const limited = /rate[- ]?overlimit|rate.?limit|429/i.test(error?.message || '');
        entry.expiresAt = now() + (limited ? 300000 : 60000);
        onError?.(error);
        return entry.value;
      }).finally(() => { entry.pending = null; });
      return entry.pending;
    },
  };
}

export const metadataCache = createMetadataCache();

export function fetchParticipatingGroups(socket) {
  return metadataCache.get(socket, 'groups', () => socket.groupFetchAllParticipating(), {
    fallback: {},
    onError: (error) => console.warn('[WhatsApp] Daftar grup ditunda:', error.message),
  });
}

export function fetchGroupMetadata(socket, jid) {
  return metadataCache.get(socket, `group:${jid}`, () => socket.groupMetadata(jid), {
    onError: (error) => console.warn('[WhatsApp] Metadata grup ditunda:', error.message),
  });
}
