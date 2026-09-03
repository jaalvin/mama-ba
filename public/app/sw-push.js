/**
 * public/sw-push.js
 *
 * Mama Ba Custom Service Worker — Web Push Handler
 *
 * This service worker listens for 'push' events from the backend (Web Push API)
 * and displays them as native OS notifications, even when the PWA is closed.
 *
 * Compatible with:
 *  - Android Chrome PWA (full background push)
 *  - iOS Safari PWA 16.4+ (installed to Home Screen)
 */

// ── Self-install: take control immediately ────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push Event Handler ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Mama Ba', body: event.data.text() };
  }

  const title   = data.title || 'Mama Ba';
  const options = {
    body:    data.body || '',
    icon:    data.icon  || '/icons/icon-192.png',
    badge:   data.badge || '/icons/icon-192.png',
    tag:     data.tag   || `mama-ba-${Date.now()}`,
    vibrate: [200, 100, 200],
    renotify: true,
    data:    { url: data.data?.url || '/app' },
    actions: [
      { action: 'open',    title: 'Open Mama Ba' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click Handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open window if available
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Periodic Background Sync (Android fallback) ───────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mama-ba-reminder-sync') {
    event.waitUntil(
      // Notify via SW in case push missed
      self.registration.showNotification('Mama Ba Reminder', {
        body: 'Check your medication and appointment reminders.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'periodic-reminder',
      })
    );
  }
});
