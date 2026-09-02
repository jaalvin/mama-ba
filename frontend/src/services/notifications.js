/**
 * src/services/notifications.js
 *
 * PWA & Web Notifications API helper.
 * Supports ServiceWorkerRegistration.showNotification() for mobile PWAs (iOS & Android)
 * with a fallback to the standard window.Notification constructor.
 */

/** Ask the user for notification permission (idempotent). */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";
  return Notification.requestPermission();
}

/**
 * Fire a native device/PWA notification if permission is granted.
 * Silently no-ops when permission is not granted or API is unsupported.
 */
export async function showDeviceNotification(title, body, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  let permission = Notification.permission;
  if (permission === "default") {
    try { permission = await Notification.requestPermission(); } catch {}
  }
  if (permission !== "granted") return false;

  const notifOptions = {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: [200, 100, 200],
    tag: options.tag || `mama-ba-${Date.now()}`,
    ...options,
  };

  // 1. Mobile PWA requires ServiceWorkerRegistration.showNotification
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notifOptions);
        return true;
      }
    }
  } catch (e) {
    /* Fall through to window.Notification fallback */
  }

  // 2. Desktop / standard browser fallback
  try {
    new Notification(title, notifOptions);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule a one-shot device notification at a specific epoch timestamp.
 * Returns a cleanup function that cancels the timer.
 */
export function scheduleAlarm(targetMs, title, body) {
  const delay = targetMs - Date.now();
  if (delay <= 0) return () => {};
  const id = setTimeout(() => showDeviceNotification(title, body), delay);
  return () => clearTimeout(id);
}

/**
 * Given a time string "HH:MM", compute the next ms epoch when that time
 * occurs (today if still in the future, tomorrow otherwise).
 */
export function nextOccurrenceMs(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const t = new Date();
  t.setHours(h, m, 0, 0);
  if (t <= new Date()) t.setDate(t.getDate() + 1);
  return t.getTime();
}
