/**
 * src/services/notifications.js
 *
 * PWA & Web Notifications helper.
 *
 * Supports:
 *  - ServiceWorkerRegistration.showNotification() for foreground PWA notifications
 *  - Web Push API (VAPID) subscription management for background/lock-screen notifications
 *  - Fallback to window.Notification for desktop browsers
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ─── Register the custom push service worker ──────────────────────────────────
let _swRegistration = null;

async function getSwRegistration() {
  if (_swRegistration) return _swRegistration;
  if (!("serviceWorker" in navigator)) return null;

  try {
    // Register our dedicated push SW
    const reg = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
    _swRegistration = reg;
    return reg;
  } catch (e) {
    // Fallback: try to get any existing registration
    try {
      const existing = await navigator.serviceWorker.ready;
      _swRegistration = existing;
      return existing;
    } catch {
      return null;
    }
  }
}

// ─── Request notification permission ──────────────────────────────────────────
/** Ask the user for notification permission (idempotent). */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";

  // Must be called from a user gesture context (button click) on iOS
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

// ─── Show foreground device notification ──────────────────────────────────────
/**
 * Fire a native device/PWA notification if permission is granted.
 * Uses ServiceWorker.showNotification for mobile (required for iOS PWA).
 * Falls back to window.Notification for desktop.
 */
const _recentlyPoppedNotifs = new Map();

export async function showDeviceNotification(title, body, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  // Deduplicate identical notifications popping within 10 seconds
  const notifKey = `${title}:::${body}`;
  const lastPop = _recentlyPoppedNotifs.get(notifKey);
  if (lastPop && Date.now() - lastPop < 10000) {
    return false;
  }
  _recentlyPoppedNotifs.set(notifKey, Date.now());

  let permission = Notification.permission;
  if (permission === "default") {
    try { permission = await Notification.requestPermission(); } catch {}
  }
  if (permission !== "granted") return false;

  const notifOptions = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: options.tag || `mama-ba-${Date.now()}`,
    renotify: true,
    ...options,
  };

  // 1. Try ServiceWorkerRegistration.showNotification (required for iOS PWA + Android PWA)
  try {
    const reg = await getSwRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, notifOptions);
      return true;
    }
  } catch (e) {
    // Fall through
  }

  // 2. Desktop / standard browser fallback
  try {
    new Notification(title, notifOptions);
    return true;
  } catch {
    return false;
  }
}

// ─── Schedule a one-shot in-app notification timer ────────────────────────────
/**
 * Schedule a one-shot device notification at a specific epoch timestamp.
 * NOTE: This only works while the app tab is open (foreground).
 * For background delivery, use subscribeToPush + registerPushReminder.
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

// ─── Web Push Subscription (Background / Lock-Screen Push) ────────────────────

/**
 * Subscribe the browser to Web Push and send the subscription to the backend.
 * This enables lock-screen notifications even when the app is closed.
 *
 * @param {string} userId — the Mama Ba user ID
 * @param {string} accessToken — JWT token
 * @returns {Promise<boolean>} — true if subscription succeeded
 */
export async function subscribeToPush(userId, accessToken) {
  if (!userId || !("PushManager" in window)) return false;

  try {
    // 1. Get VAPID public key from backend
    const keyRes = await fetch(`${API_BASE}/push/vapid-key`);
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    // 2. Get SW registration
    const reg = await getSwRegistration();
    if (!reg) return false;

    // 3. Request permission if needed
    const permission = await requestNotificationPermission();
    if (permission !== "granted") return false;

    // 4. Subscribe
    const urlBase64ToUint8 = (base64) => {
      const padding = "=".repeat((4 - (base64.length % 4)) % 4);
      const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64url);
      return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    };

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8(publicKey),
    });

    // 5. Send subscription to backend
    const subJson = subscription.toJSON();
    await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ userId, subscription: subJson }),
    });

    console.log("[Push] ✅ Web Push subscription registered for", userId);
    return true;
  } catch (e) {
    console.warn("[Push] Subscribe error:", e.message);
    return false;
  }
}

/**
 * Register a recurring daily push reminder on the backend.
 * The backend cron job will fire the push at the right time every day,
 * even when the app is completely closed.
 *
 * @param {string} userId
 * @param {string} eventId — unique ID for this reminder (e.g. "med-abc123-daily")
 * @param {string} title — notification title
 * @param {string} body — notification body
 * @param {string} scheduledTime — "HH:MM" for daily, or ISO datetime for once
 * @param {"daily"|"once"} recurrence
 * @param {string} [accessToken]
 */
export async function registerPushReminder(userId, eventId, title, body, scheduledTime, recurrence = "daily", accessToken = "") {
  if (!userId || !eventId) return;
  try {
    await fetch(`${API_BASE}/push/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ userId, eventId, title, body, scheduledTime, recurrence, tag: eventId }),
    });
  } catch (e) {
    console.warn("[Push] registerPushReminder error:", e.message);
  }
}

/**
 * Cancel a scheduled push reminder on the backend.
 */
export async function cancelPushReminder(eventId, accessToken = "") {
  if (!eventId) return;
  try {
    await fetch(`${API_BASE}/push/schedule/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  } catch (e) {
    console.warn("[Push] cancelPushReminder error:", e.message);
  }
}
