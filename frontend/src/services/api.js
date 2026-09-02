/**
 * src/services/api.js  (updated)
 *
 * Central API service layer. All data access goes through here.
 * In DEMO_MODE (VITE_DEMO_MODE=true), every call uses a localStorage shim.
 * When a real backend is connected, calls use authenticated fetch.
 */

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ─── Generic authenticated fetch ────────────────────────────────────────────
export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
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
  list: (token) => DEMO_MODE ? Promise.resolve(medsStore.get()) : apiFetch("/medications", token),
  create: (token, med) => {
    if (DEMO_MODE) {
      const item = { ...med, id: `med-${Date.now()}` };
      medsStore.set([...medsStore.get(), item]);
      return Promise.resolve(item);
    }
    return apiFetch("/medications", token, { method: "POST", body: JSON.stringify(med) });
  },
  remove: (token, id) => {
    if (DEMO_MODE) { medsStore.set(medsStore.get().filter(m => m.id !== id)); return Promise.resolve(); }
    return apiFetch(`/medications/${id}`, token, { method: "DELETE" });
  },
};

// ─── Vitals ───────────────────────────────────────────────────────────────────
const vitalsStore = store("mama-ba-vitals", {});

export const vitals = {
  history: (token) => {
    if (DEMO_MODE) return Promise.resolve(vitalsStore.get());
    return apiFetch("/vitals/history", token)
      .then((res) => (res && res.data ? res.data : vitalsStore.get()))
      .catch(() => vitalsStore.get());
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
      const res = await apiFetch("/vitals/log", token, { method: "POST", body: JSON.stringify(readings) });
      return res && res.data ? res.data : updated;
    } catch (e) {
      // If backend network call notice, return local updated state so UI never breaks
      return updated;
    }
  },
};

// ─── ANC Appointments (user-defined) ─────────────────────────────────────────
// { id, title, hospital, date, time, notes, done }
const ancApptStore = store("mama-ba-anc-appointments", []);

export const ancAppointments = {
  list: (token) => DEMO_MODE ? Promise.resolve(ancApptStore.get()) : apiFetch("/anc-appointments", token),
  create: (token, appt) => {
    if (DEMO_MODE) {
      const item = { ...appt, id: `anc-${Date.now()}`, done: false };
      ancApptStore.set([...ancApptStore.get(), item]);
      return Promise.resolve(item);
    }
    return apiFetch("/anc-appointments", token, { method: "POST", body: JSON.stringify(appt) });
  },
  update: (token, id, changes) => {
    if (DEMO_MODE) {
      const next = ancApptStore.get().map(a => a.id === id ? { ...a, ...changes } : a);
      ancApptStore.set(next);
      return Promise.resolve(next.find(a => a.id === id));
    }
    return apiFetch(`/anc-appointments/${id}`, token, { method: "PATCH", body: JSON.stringify(changes) });
  },
  remove: (token, id) => {
    if (DEMO_MODE) { ancApptStore.set(ancApptStore.get().filter(a => a.id !== id)); return Promise.resolve(); }
    return apiFetch(`/anc-appointments/${id}`, token, { method: "DELETE" });
  },
};

// ─── Care Appointments (CareLogistics) ───────────────────────────────────────
// { id, primaryHospital, backupHospital, visitType, date, time, reason }
const careApptStore = store("mama-ba-care-appointments", []);

export const careAppointments = {
  list: (token) => DEMO_MODE ? Promise.resolve(careApptStore.get()) : apiFetch("/appointments", token),
  create: (token, appt) => {
    if (DEMO_MODE) {
      const item = { ...appt, id: `care-${Date.now()}` };
      careApptStore.set([...careApptStore.get(), item]);
      return Promise.resolve(item);
    }
    return apiFetch("/appointments", token, { method: "POST", body: JSON.stringify(appt) });
  },
  remove: (token, id) => {
    if (DEMO_MODE) { careApptStore.set(careApptStore.get().filter(a => a.id !== id)); return Promise.resolve(); }
    return apiFetch(`/appointments/${id}`, token, { method: "DELETE" });
  },
};

// ─── ANC Visit status (legacy — kept for backward compat) ────────────────────
const ancStore = store("mama-ba-anc", []);
export const ancVisits = {
  listStatus: (token) => DEMO_MODE ? Promise.resolve(ancStore.get()) : apiFetch("/anc-visits", token),
  setStatus: (token, n, status, meta = {}) => {
    if (DEMO_MODE) {
      const existing = ancStore.get();
      const idx = existing.findIndex(v => v.n === n);
      const entry = { n, status, ...meta };
      ancStore.set(idx >= 0 ? existing.map(v => v.n === n ? entry : v) : [...existing, entry]);
      return Promise.resolve(entry);
    }
    return apiFetch(`/anc-visits/${n}`, token, { method: "PATCH", body: JSON.stringify({ status, ...meta }) });
  },
};

// ─── Vaccine status ───────────────────────────────────────────────────────────
const vaccStore = store("mama-ba-vaccines", []);
export const vaccines = {
  listStatus: (token) => DEMO_MODE ? Promise.resolve(vaccStore.get()) : apiFetch("/vaccines", token),
  toggle: (token, id, done) => {
    if (DEMO_MODE) {
      const existing = vaccStore.get();
      const idx = existing.findIndex(v => v.id === id);
      const entry = { id, done };
      vaccStore.set(idx >= 0 ? existing.map(v => v.id === id ? entry : v) : [...existing, entry]);
      return Promise.resolve(entry);
    }
    return apiFetch(`/vaccines/${id}`, token, { method: "PATCH", body: JSON.stringify({ done }) });
  },
};

// ─── Emergency Contacts ───────────────────────────────────────────────────────
const contactsStore = store("mama-ba-emergency-contacts", []);
export const emergencyContacts = {
  list: (token) => DEMO_MODE ? Promise.resolve(contactsStore.get()) : apiFetch("/emergency-contacts", token),
  create: (token, contact) => {
    if (DEMO_MODE) {
      const item = { ...contact, id: Date.now() };
      contactsStore.set([...contactsStore.get(), item]);
      return Promise.resolve(item);
    }
    return apiFetch("/emergency-contacts", token, { method: "POST", body: JSON.stringify(contact) });
  },
  remove: (token, id) => {
    if (DEMO_MODE) { contactsStore.set(contactsStore.get().filter(c => c.id !== id)); return Promise.resolve(); }
    return apiFetch(`/emergency-contacts/${id}`, token, { method: "DELETE" });
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

