/**
 * src/services/reminderEngine.js
 *
 * Global PWA Reminder Engine.
 * Runs a 15-second polling loop checking scheduled medications, ANC visits,
 * and care appointments against the current time ("HH:MM").
 *
 * Fires both PWA native OS notifications and in-app toasts.
 */
import { showDeviceNotification } from "./notifications.js";

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
  const ancKey = `mama_ba_usr_${uid}_mama-ba-anc-appointments`;

  try {
    const existingMeds = JSON.parse(localStorage.getItem(medsKey) || "[]");
    if (!existingMeds || existingMeds.length === 0) {
      const defaults = [
        { id: "med-default-1", label: "Iron & Folic Acid", time: "14:00" },
        { id: "med-default-2", label: "Calcium & Multivitamin", time: "20:00" },
      ];
      localStorage.setItem(medsKey, JSON.stringify(defaults));
    }

    const existingAnc = JSON.parse(localStorage.getItem(ancKey) || "[]");
    if (!existingAnc || existingAnc.length === 0) {
      const defaultAnc = [
        {
          id: "anc-default-1",
          title: "ANC Visit 2 (16 Wks)",
          hospital: "GHS Local Clinic",
          date: new Date().toISOString().split("T")[0],
          time: "09:00",
          done: false,
        },
      ];
      localStorage.setItem(ancKey, JSON.stringify(defaultAnc));
    }
  } catch {}
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

          showDeviceNotification(titleEn, bodyEn, { tag: eventId });
          if (addNotification) {
            addNotification({
              type: "reminder",
              titleEn,
              titleTwi,
              bodyEn,
              bodyTwi,
            });
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

          showDeviceNotification(titleEn, bodyEn, { tag: eventId });
          if (addNotification) {
            addNotification({
              type: "warning",
              titleEn,
              titleTwi,
              bodyEn,
              bodyTwi,
            });
          }
        }
      });
    } catch {}
  };

  // Run check immediately and every 15 seconds
  check();
  const intervalId = setInterval(check, 15_000);
  return () => clearInterval(intervalId);
}
