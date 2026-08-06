// OneCompliment service worker — Web Push receiver.
//
// Registered from lib/webPush.ts on subscribe. Lifecycle: install →
// activate (claim all clients immediately so we don't have to wait for
// every tab to reload before pushes work) → push (display notification)
// → notificationclick (open or focus the app).
//
// Versioned name so a future bump to v2 evicts the v1 cache cleanly:
const VERSION = 'oc-sw-v1';

self.addEventListener('install', (event) => {
  // Skip the standard "waiting" phase — apply the new worker immediately
  // even if older tabs are still open. Safe because we don't cache anything.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of existing tabs immediately rather than after a refresh.
  event.waitUntil(self.clients.claim());
});

// Push event: the Edge Function POSTed an encrypted payload to the push
// service, which decrypted it and woke us up. event.data is a PushMessageData.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // If parsing fails, still show something rather than swallowing silently.
    payload = { title: 'OneCompliment', body: 'You received a compliment 🌻' };
  }

  const {
    title = 'OneCompliment 🌻',
    body  = 'You received a compliment.',
    data  = {},
  } = payload;

  const options = {
    body,
    icon:  '/icon-192.png',         // referenced by the manifest; falls back to favicon if missing
    badge: '/icon-192.png',
    tag:   data.completion_id || 'compliment',  // collapses duplicate notifications
    renotify: true,
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click event: focus an existing tab if one's open, otherwise open the app.
// Deep-link target: a personal compliment with a completion_id goes straight
// to its /c/:id page (the documented push→compliment route). Team/group
// completions can't render there — get_public_compliment only reads the
// personal `compliments` table — so they land on /history, where the
// received list lives.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const isPersonal = data.source !== 'team' && data.source !== 'group';
  const target = isPersonal && data.completion_id
    ? `/c/${encodeURIComponent(data.completion_id)}`
    : '/history';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // If a OneCompliment tab is already open, focus it instead of spawning a new one.
    for (const client of allClients) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) {
        await client.focus();
        // Navigate the focused tab to the target (best-effort; some browsers
        // disallow cross-origin nav, but we're same-origin here).
        if ('navigate' in client) {
          try { await client.navigate(target); } catch { /* fine */ }
        }
        return;
      }
    }
    // No tab open — open a new one.
    await self.clients.openWindow(target);
  })());
});
