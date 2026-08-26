/**
 * The Guided Health Companion (Patient App)
 * Frontend API Bridge Module
 */

const API_BASE_URL = '/api/v1';

async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || `HTTP ${response.status}` };
    }

    return json;
  } catch (err) {
    return {
      success: false,
      error: 'Network request failed. Operating in Local Offline Mode.'
    };
  }
}

export const API = {
  // System Health
  async getHealth() {
    return apiRequest('/health');
  },

  // 1. Herbal Safety Checker
  async checkHerbalSafety(params) {
    return apiRequest('/herbal-safety/check', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 2. Offline Symptom Triage
  async evaluateTriage(params) {
    return apiRequest('/triage/evaluate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 3. Maternal ANC & Immunization Schedules
  async getANCSchedule(params) {
    return apiRequest('/maternal/anc-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getImmunizationSchedule(params) {
    return apiRequest('/maternal/immunization-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 4. Vitals & Journal
  async logVitals(params) {
    return apiRequest('/vitals/log', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async saveHealthJournal(params) {
    return apiRequest('/vitals/journal', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // 5. Multilingual RAG Chatbot & Khaya ASR Speech Recognition
  async askChatbot(params) {
    return apiRequest('/chat/query', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async transcribeVoice(params) {
    return apiRequest('/chat/asr', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getChatHistory(userId) {
    return apiRequest(`/chat/history/${encodeURIComponent(userId)}`);
  },

  async getPresetCards() {
    return apiRequest('/chat/preset-cards');
  },

  // Profile
  async getProfile(userId) {
    return apiRequest(`/auth/profile/${encodeURIComponent(userId)}`);
  },

  async saveProfile(profile) {
    return apiRequest('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  }
};
