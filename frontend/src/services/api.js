/**
 * src/services/api.js  (updated)
 *
 * Central API service layer. All data access goes through here.
 * In DEMO_MODE (VITE_DEMO_MODE=true), every call uses a localStorage shim.
 * When a real backend is connected, calls use authenticated fetch.
 */
import { supabase } from "../lib/supabase.js";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ─── Generic authenticated fetch ────────────────────────────────────────────
export async function apiFetch(path, token, options = {}) {
  const activeUserId = getActiveUserId();
  const headers = {
    "Content-Type": "application/json",
    ...(activeUserId ? { "x-user-id": activeUserId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status}): ${path}`);
  }
  return res.status === 204 ? null : res.json();
}

// ─── User-Partitioned localStorage Shim Factory ────────────────────────────────
function getActiveUserId() {
  try {
    return localStorage.getItem("mama_ba_active_user_id") || "guest";
  } catch {
    return "guest";
  }
}

function store(baseKey, defaultValue = []) {
  return {
    get(targetUserId) {
      const uid = targetUserId || getActiveUserId();
      const storageKey = `mama_ba_usr_${uid}_${baseKey}`;
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(value, targetUserId) {
      const uid = targetUserId || getActiveUserId();
      const storageKey = `mama_ba_usr_${uid}_${baseKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (e) {
        console.warn("[LocalStore] Save warning:", e);
      }
    },
  };
}

export function clearLocalUserCache(userId) {
  const uid = userId || getActiveUserId();
  if (!uid || uid === "guest") return;
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`mama_ba_usr_${uid}_`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn("[LocalStore] Cache clear notice:", e);
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────
const notifStore = store("mama-ba-notifications", []);

export const notifications = {
  list:    (token) => DEMO_MODE ? Promise.resolve(notifStore.get()) : apiFetch("/notifications", token),
  create:  (token, notif) => {
    if (DEMO_MODE) {
      const item = { ...notif, id: `notif-${Date.now()}`, createdAt: Date.now(), read: false };
      notifStore.set([item, ...notifStore.get()]);
      return Promise.resolve(item);
    }
    return apiFetch("/notifications", token, { method: "POST", body: JSON.stringify(notif) });
  },
  markRead: (token, id) => {
    if (DEMO_MODE) { notifStore.set(notifStore.get().map(n => n.id === id ? { ...n, read: true } : n)); return Promise.resolve(); }
    return apiFetch(`/notifications/${id}/read`, token, { method: "PATCH" });
  },
  markAllRead: (token) => {
    if (DEMO_MODE) { notifStore.set(notifStore.get().map(n => ({ ...n, read: true }))); return Promise.resolve(); }
    return apiFetch("/notifications/read-all", token, { method: "PATCH" });
  },
  remove: (token, id) => {
    if (DEMO_MODE) { notifStore.set(notifStore.get().filter(n => n.id !== id)); return Promise.resolve(); }
    return apiFetch(`/notifications/${id}`, token, { method: "DELETE" });
  },
};

// ─── Medications ─────────────────────────────────────────────────────────────
const medsStore = store("mama-ba-medications", []);

export const medications = {
  list: async (token) => {
    const local = medsStore.get();
    try {
      const activeUserId = getActiveUserId();
      const res = await apiFetch(`/reminders/${encodeURIComponent(activeUserId)}`, token);
      if (res && res.data && Array.isArray(res.data)) {
        const remoteMeds = res.data.map(r => ({
          id: r.id,
          label: r.title,
          time: r.scheduledTime || r.scheduled_time,
          isCompleted: Boolean(r.isCompleted)
        }));
        if (remoteMeds.length > 0) {
          medsStore.set(remoteMeds);
          return remoteMeds;
        }
      }
    } catch (e) {
      console.warn("[Medications] Backend fetch notice, using local cache:", e);
    }
    return local;
  },
  create: async (token, med) => {
    const item = {
      id: med.id || `med-${Date.now()}`,
      label: med.label || med.name || "Medication",
      time: med.time || "08:00",
      ...med
    };
    // Always persist to local user store immediately
    const updated = [...medsStore.get().filter(m => m.id !== item.id), item];
    medsStore.set(updated);

    if (!DEMO_MODE) {
      try {
        const activeUserId = getActiveUserId();
        await apiFetch("/reminders", token, {
          method: "POST",
          body: JSON.stringify({
            userId: activeUserId,
            title: item.label,
            reminderType: "MEDICATION",
            scheduledTime: item.time,
            recurrence: "DAILY"
          })
        });
      } catch (e) {
        console.warn("[Medications] Backend sync warning (item persisted locally):", e);
      }
    }
    return item;
  },
  remove: async (token, id) => {
    const updated = medsStore.get().filter(m => m.id !== id);
    medsStore.set(updated);

    if (!DEMO_MODE) {
      try {
        await apiFetch(`/reminders/${encodeURIComponent(id)}`, token, { method: "DELETE" });
      } catch (e) {
        console.warn("[Medications] Backend remove warning:", e);
      }
    }
    return Promise.resolve();
  },
};

// ─── Vitals ───────────────────────────────────────────────────────────────────
const vitalsStore = store("mama-ba-vitals", {});

export const vitals = {
  history: async (token) => {
    const local = vitalsStore.get();
    try {
      const activeUserId = getActiveUserId();
      const res = await apiFetch(`/vitals/history/${encodeURIComponent(activeUserId)}`, token);
      if (res && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn("[Vitals] Fetch notice, using local cache:", e);
    }
    return local;
  },
  save: async (token, readings) => {
    // Always update local vitalsStore for instant sparkline chart updates
    const current = vitalsStore.get();
    const updated = { ...current };
    Object.entries(readings).forEach(([key, val]) => {
      if (val !== undefined && val !== "") {
        updated[key] = [...(updated[key] || []), parseFloat(val)].slice(-7);
      }
    });
    vitalsStore.set(updated);

    if (DEMO_MODE) return Promise.resolve(updated);

    try {
      const activeUserId = getActiveUserId();
      const res = await apiFetch("/vitals/log", token, {
        method: "POST",
        body: JSON.stringify({ userId: activeUserId, ...readings })
      });
      return res && res.data ? res.data : updated;
    } catch (e) {
      return updated;
    }
  },
};

// ─── ANC Appointments (user-defined) ─────────────────────────────────────────
// { id, title, hospital, date, time, notes, done }
const ancApptStore = store("mama-ba-anc-appointments", []);

export const ancAppointments = {
  list: async (token) => {
    const local = ancApptStore.get();
    try {
      const activeUserId = getActiveUserId();
      const res = await apiFetch(`/maternal/user-schedules/${encodeURIComponent(activeUserId)}`, token);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Save remote data to local cache so it persists on refresh
        ancApptStore.set(res.data);
        return res.data;
      }
    } catch { /* fallback to local */ }
    return local;
  },
  create: async (token, appt) => {
    const item = { ...appt, id: appt.id || `anc-${Date.now()}`, done: false };
    const updated = [...ancApptStore.get().filter(a => a.id !== item.id), item];
    ancApptStore.set(updated);

    if (!DEMO_MODE) {
      try {
        const activeUserId = getActiveUserId();
        await apiFetch("/maternal/user-schedules", token, {
          method: "POST",
          body: JSON.stringify({ userId: activeUserId, items: [item] })
        });
      } catch (e) {
        console.warn("[ANCAppointments] Sync warning:", e);
      }
    }
    return item;
  },
  update: async (token, id, changes) => {
    const next = ancApptStore.get().map(a => a.id === id ? { ...a, ...changes } : a);
    ancApptStore.set(next);
    if (!DEMO_MODE) {
      try {
        const activeUserId = getActiveUserId();
        await apiFetch("/maternal/user-schedules/toggle", token, {
          method: "PATCH",
          body: JSON.stringify({ userId: activeUserId, itemId: id, isCompleted: Boolean(changes.done) })
        });
      } catch { /* fallback */ }
    }
    return next.find(a => a.id === id);
  },
  remove: async (token, id) => {
    ancApptStore.set(ancApptStore.get().filter(a => a.id !== id));
    return Promise.resolve();
  },
};

// ─── Care Appointments (CareLogistics) ───────────────────────────────────────
// { id, primaryHospital, backupHospital, visitType, date, time, reason }
const careApptStore = store("mama-ba-care-appointments", []);

export const careAppointments = {
  list: async (token) => {
    const local = careApptStore.get();
    try {
      const activeUserId = getActiveUserId();
      const res = await apiFetch(`/logistics/appointments/${encodeURIComponent(activeUserId)}`, token);
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch { /* fallback */ }
    return local;
  },
  create: async (token, appt) => {
    const item = { ...appt, id: appt.id || `care-${Date.now()}` };
    const updated = [...careApptStore.get().filter(a => a.id !== item.id), item];
    careApptStore.set(updated);

    if (!DEMO_MODE) {
      try {
        const activeUserId = getActiveUserId();
        await apiFetch("/logistics/appointments/book", token, {
          method: "POST",
          body: JSON.stringify({
            userId: activeUserId,
            facilityName: item.hospital || item.primaryHospital || "Hospital",
            appointmentType: item.visitType === "virtual" ? "VIRTUAL" : "IN_PERSON",
            requestedDate: item.date || new Date().toISOString().split("T")[0],
            notes: item.notes || item.reason || ""
          })
        });
      } catch (e) {
        console.warn("[CareAppointments] Sync warning:", e);
      }
    }
    return item;
  },
  remove: async (token, id) => {
    careApptStore.set(careApptStore.get().filter(a => a.id !== id));
    return Promise.resolve();
  },
};

// ─── ANC Visit status (legacy — kept for backward compat) ────────────────────
const ancStore = store("mama-ba-anc", []);
export const ancVisits = {
  listStatus: (token) => DEMO_MODE ? Promise.resolve(ancStore.get()) : apiFetch("/anc-visits", token),
  setStatus: (token, n, status, meta = {}) => {
    const existing = ancStore.get();
    const idx = existing.findIndex(v => v.n === n);
    const entry = { n, status, ...meta };
    ancStore.set(idx >= 0 ? existing.map(v => v.n === n ? entry : v) : [...existing, entry]);
    return Promise.resolve(entry);
  },
};

// ─── Vaccine status ───────────────────────────────────────────────────────────
const vaccStore = store("mama-ba-vaccines", []);
export const vaccines = {
  listStatus: async (token) => {
    const local = vaccStore.get();
    // Try Supabase for fresh data
    try {
      const activeUserId = getActiveUserId();
      if (supabase && activeUserId && activeUserId !== "guest") {
        const { data } = await supabase
          .from("immunization_records")
          .select("vaccine_id, done")
          .eq("user_id", activeUserId);
        if (data && data.length > 0) {
          const mapped = data.map(r => ({ id: r.vaccine_id, done: r.done }));
          vaccStore.set(mapped);
          return mapped;
        }
      }
    } catch { /* fallback */ }
    return local;
  },
  toggle: async (token, id, done) => {
    // 1. Update localStorage immediately
    const existing = vaccStore.get();
    const idx = existing.findIndex(v => v.id === id);
    const entry = { id, done };
    vaccStore.set(idx >= 0 ? existing.map(v => v.id === id ? entry : v) : [...existing, entry]);

    // 2. Persist to Supabase
    try {
      const activeUserId = getActiveUserId();
      if (supabase && activeUserId && activeUserId !== "guest") {
        await supabase
          .from("immunization_records")
          .upsert({ user_id: activeUserId, vaccine_id: id, done, updated_at: new Date().toISOString() },
            { onConflict: "user_id,vaccine_id" });
      }
    } catch (e) {
      console.warn("[Vaccines] Supabase sync notice:", e);
    }
    return Promise.resolve(entry);
  },
};

// ─── Emergency Contacts ───────────────────────────────────────────────────────
const contactsStore = store("mama-ba-emergency-contacts", []);
export const emergencyContacts = {
  list: async (token) => {
    return contactsStore.get();
  },
  create: async (token, contact) => {
    const item = { ...contact, id: contact.id || Date.now() };
    const updated = [...contactsStore.get().filter(c => c.id !== item.id), item];
    contactsStore.set(updated);

    if (!DEMO_MODE) {
      try {
        const activeUserId = getActiveUserId();
        await apiFetch("/auth/profile", token, {
          method: "POST",
          body: JSON.stringify({
            userId: activeUserId,
            primaryContactName: item.name,
            primaryContactPhone: item.phone,
            relationship: item.relationship
          })
        });
      } catch (e) {
        console.warn("[EmergencyContacts] Sync warning:", e);
      }
    }
    return item;
  },
  remove: async (token, id) => {
    contactsStore.set(contactsStore.get().filter(c => c.id !== id));
    return Promise.resolve();
  },
};

// ─── Recents helpers (User-Partitioned) ───────────────────────────────────────
const RECENTS_MAX = 5;

export function getRecents(key) {
  const uid = getActiveUserId();
  const storageKey = `mama_ba_usr_${uid}_recents_${key}`;
  try { return JSON.parse(localStorage.getItem(storageKey)) ?? []; }
  catch { return []; }
}

export function addRecent(key, value) {
  if (!value?.trim()) return;
  const uid = getActiveUserId();
  const storageKey = `mama_ba_usr_${uid}_recents_${key}`;
  const list = [value.trim(), ...getRecents(key).filter(v => v !== value.trim())].slice(0, RECENTS_MAX);
  localStorage.setItem(storageKey, JSON.stringify(list));
}

// ─── Lily Express Backend API Bridge (/api/v1) ──────────────────────────────
const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

async function backendFetch(endpoint, options = {}) {
  try {
    const url = `${BACKEND_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const response = await fetch(url, { ...options, headers });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: json.error || json.message || `HTTP ${response.status}` };
    }
    return json;
  } catch (err) {
    return { success: false, error: "Backend network connection failed." };
  }
}

export const api = {
  async askChatbot(params) {
    return backendFetch("/chat/query", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async transcribeVoice(params) {
    return backendFetch("/chat/asr", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async synthesizeSpeech(params) {
    try {
      const response = await fetch(`${BACKEND_BASE}/chat/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (response.ok) {
        const blob = await response.blob();
        return { success: true, blob };
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async checkHerbalSafety(params) {
    return backendFetch("/herbal-safety/check", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async evaluateHerbSafety(params) {
    return backendFetch("/herbal-safety/evaluate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async checkCombinationSafety(params) {
    return backendFetch("/herbal-safety/check-combination", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async evaluateTriage(params) {
    return backendFetch("/triage/evaluate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async logVitals(params) {
    return backendFetch("/vitals/log", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async getVitalsHistory(userId = "demo-patient-001") {
    return backendFetch(`/vitals/history/${encodeURIComponent(userId)}`);
  },
};

