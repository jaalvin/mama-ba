/**
 * src/services/reminderEngine.js
 *
 * Global PWA Reminder Engine.
 * Runs a 15-second polling loop checking scheduled medications, ANC visits,
 * and care appointments against the current time ("HH:MM").
 *
 * Fires both:
 *  1. PWA native OS notifications via ServiceWorker (foreground — when app is open)
 *  2. Backend-scheduled Web Push notifications (background — app closed or minimized)
 */
import { showDeviceNotification, registerPushReminder } from "./notifications.js";

const LAST_NOTIFIED_KEY = "mama_ba_pwa_last_notified";

function getNotifiedMap() {
  try {
    return JSON.parse(localStorage.getItem(LAST_NOTIFIED_KEY)) || {};
  } catch {
    return {};
  }
}

function saveNotifiedMap(map) {
  try {
    localStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(map));
  } catch {}
}

export function seedDefaultRemindersIfEmpty(uid = "guest") {
  const medsKey = `mama_ba_usr_${uid}_mama-ba-medications`;
  try {
    const existingMeds = JSON.parse(localStorage.getItem(medsKey) || "[]");
    if (!existingMeds || existingMeds.length === 0) {
      const defaults = [
        { id: "med-default-1", label: "Iron & Folic Acid", time: "14:00" },
        { id: "med-default-2", label: "Calcium & Multivitamin", time: "20:00" },
      ];
      localStorage.setItem(medsKey, JSON.stringify(defaults));
    }
  } catch {}
}

/**
 * Register all current medications as backend push reminders.
 * Call this when the user logs in or adds/removes a medication.
 */
export async function syncMedicationPushReminders(uid = "guest", accessToken = "") {
  if (!uid || uid === "guest") return;
  try {
    const medsKey = `mama_ba_usr_${uid}_mama-ba-medications`;
    const meds = JSON.parse(localStorage.getItem(medsKey) || "[]");
    for (const m of meds) {
      if (!m.time) continue;
      await registerPushReminder(
        uid,
        `med_${m.id}_daily`,
        "💊 Medication Time!",
        `Time to take ${m.label}`,
        m.time,
        "daily",
        accessToken
      );
    }
  } catch (e) {
    console.warn("[ReminderEngine] syncMedicationPushReminders error:", e);
  }
}

/**
 * Register an ANC appointment as a backend push reminder (24h + 1h before).
 */
export async function registerAncPushReminders(appt, uid = "guest", accessToken = "") {
  if (!uid || uid === "guest" || !appt?.date || !appt?.time) return;
  const apptMs = new Date(`${appt.date}T${appt.time}`).getTime();
  if (isNaN(apptMs)) return;

  const dayBefore = new Date(apptMs - 24 * 3600 * 1000);
  const hourBefore = new Date(apptMs - 3600 * 1000);

  if (dayBefore > new Date()) {
    const h24Time = `${String(dayBefore.getHours()).padStart(2,'0')}:${String(dayBefore.getMinutes()).padStart(2,'0')}`;
    const h24Date = dayBefore.toISOString();
    await registerPushReminder(
      uid, `anc_${appt.id}_24h`, "🏥 Appointment Tomorrow",
      `${appt.title} at ${appt.hospital || "your clinic"} — ${appt.time}`,
      h24Date, "once", accessToken
    );
  }

  if (hourBefore > new Date()) {
    const h1Date = hourBefore.toISOString();
    await registerPushReminder(
      uid, `anc_${appt.id}_1h`, "🏥 Appointment in 1 Hour",
      `${appt.title} at ${appt.hospital || "your clinic"}`,
      h1Date, "once", accessToken
    );
  }
}

export function startPWAReminderEngine(addNotification, activeUid = "guest") {
  seedDefaultRemindersIfEmpty(activeUid);

  const check = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${hours}:${minutes}`;
    const todayDateStr = now.toISOString().split("T")[0];

    const notifiedMap = getNotifiedMap();

    // 1. Check Medications
    try {
      const medsKey = `mama_ba_usr_${activeUid}_mama-ba-medications`;
      const meds = JSON.parse(localStorage.getItem(medsKey) || "[]");

      meds.forEach((m) => {
        if (!m.time) return;
        const eventId = `med_${m.id}_${todayDateStr}`;
        if (m.time === currentTimeStr && !notifiedMap[eventId]) {
          notifiedMap[eventId] = true;
          saveNotifiedMap(notifiedMap);

          const titleEn = "💊 Medication Time!";
          const bodyEn = `Time to take ${m.label}`;
          const titleTwi = "💊 Nnuro Bere!";
          const bodyTwi = `Bere a wubegye wo nnuro – ${m.label}`;

          if (addNotification) {
            addNotification({ type: "reminder", titleEn, titleTwi, bodyEn, bodyTwi });
          } else {
            showDeviceNotification(titleEn, bodyEn, { tag: eventId });
          }
        }
      });
    } catch {}

    // 2. Check ANC Appointments
    try {
      const ancKey = `mama_ba_usr_${activeUid}_mama-ba-anc-appointments`;
      const appts = JSON.parse(localStorage.getItem(ancKey) || "[]");

      appts.forEach((a) => {
        if (a.done || !a.time || a.date !== todayDateStr) return;
        const eventId = `anc_${a.id}_${todayDateStr}`;
        if (a.time === currentTimeStr && !notifiedMap[eventId]) {
          notifiedMap[eventId] = true;
          saveNotifiedMap(notifiedMap);

          const titleEn = "🏥 ANC Appointment Reminder";
          const bodyEn = `${a.title} at ${a.hospital || "your clinic"} is scheduled now (${a.time})`;
          const titleTwi = "🏥 ANC Nhyiam Kae";
          const bodyTwi = `${a.title} wɔ ${a.hospital || "ayaresabea"} bere a aso (${a.time})`;

          if (addNotification) {
            addNotification({ type: "warning", titleEn, titleTwi, bodyEn, bodyTwi });
          } else {
            showDeviceNotification(titleEn, bodyEn, { tag: eventId });
          }
        }
      });
    } catch {}
  };

  // Run check immediately and every 15 seconds (foreground polling)
  check();
  const intervalId = setInterval(check, 15_000);
  return () => clearInterval(intervalId);
}
