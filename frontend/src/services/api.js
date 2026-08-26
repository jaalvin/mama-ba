/**
 * Mama Ba React Frontend API Bridge
 * Connects frontend UI components to Lily backend (/api/v1).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function apiFetch(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: json.error || json.message || `HTTP ${response.status}` };
    }

    return json;
  } catch (err) {
    return {
      success: false,
      error: 'Network connection failed. Check backend connection.'
    };
  }
}

export const api = {
  // System Health
  async getHealth() {
    return apiFetch('/health');
  },

  // 1. Herbal Safety Checker
  async checkHerbalSafety(params) {
    return apiFetch('/herbal-safety/check', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 2. Offline Symptom Triage
  async evaluateTriage(params) {
    return apiFetch('/triage/evaluate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 3. Maternal ANC & Immunization Schedule
  async getANCSchedule(params = {}) {
    return apiFetch('/maternal/anc-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getImmunizationSchedule(params = {}) {
    return apiFetch('/maternal/immunization-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 4. Vitals & Journal
  async logVitals(params) {
    return apiFetch('/vitals/log', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getVitalsHistory(userId = 'demo-patient-001') {
    return apiFetch(`/vitals/history/${encodeURIComponent(userId)}`);
  },

  async saveJournalEntry(params) {
    return apiFetch('/vitals/journal', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 5. RAG AI Chat & Voice
  async askChatbot(params) {
    return apiFetch('/chat/query', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async transcribeVoice(params) {
    return apiFetch('/chat/asr', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 6. User Profile
  async getProfile(userId) {
    return apiFetch(`/auth/profile/${encodeURIComponent(userId)}`);
  },

  async saveProfile(profile) {
    return apiFetch('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  },

  // 7. Care Logistics & Pharmacy Finder
  async getPharmacies(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/logistics/pharmacies${query ? `?${query}` : ''}`);
  },

  async bookAppointment(params) {
    return apiFetch('/logistics/appointments/book', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getAppointments(userId = 'demo-patient-001') {
    return apiFetch(`/logistics/appointments/${encodeURIComponent(userId)}`);
  },

  async orderPrescription(params) {
    return apiFetch('/logistics/prescription/order', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 8. Offline Sync Status
  async getSyncStatus() {
    return apiFetch('/sync/status');
  }
};

