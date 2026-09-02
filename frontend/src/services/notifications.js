/**
 * src/services/notifications.js
 * Browser Web Notifications API helper.
 * Call requestNotificationPermission() once on login.
 * Call showDeviceNotification() to fire a native OS notification.
 */

/** Ask the user for notification permission (idempotent). */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";
  return Notification.requestPermission();
}

/**
 * Fire a native device notification if permission is granted.
 * Silently no-ops when permission is not granted or API is unsupported.
 */
export function showDeviceNotification(title, body, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      ...options,
    });
  } catch {
    /* silently ignore in environments that don't support it */
  }
}

/**
 * Schedule a one-shot device notification at a specific epoch timestamp.
 * Returns a cleanup function that cancels the timer.
 *
 * @param {number}   targetMs  - epoch ms when the notification should fire
 * @param {string}   title
 * @param {string}   body
 * @returns {() => void}  cancel function
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
