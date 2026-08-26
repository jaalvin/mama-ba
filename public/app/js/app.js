/**
 * Main SPA Router & Application Controller
 * Includes SpeechService Auto-Speak and MedASR Voice Control
 */
import { API } from './api.js';
import { SpeechService } from './speechService.js';
import { OnboardingView } from './views/onboardingView.js';
import { DashboardView } from './views/dashboardView.js';
import { ChatView } from './views/chatView.js';
import { TriageView } from './views/triageView.js';
import { HerbalView } from './views/herbalView.js';
import { VitalsView } from './views/vitalsView.js';
import { MaternalView } from './views/maternalView.js';

// Application State
const savedState = localStorage.getItem('lily_app_state');
const state = savedState ? JSON.parse(savedState) : {
  userId: 'demo-patient-001',
  language: 'twi', // 'twi' | 'english' | 'dual'
  autoSpeak: true,
  activeView: 'dashboard',
  isOnline: true,
  pendingQuery: '',
  profile: {
    fullName: 'Abena Osei',
    isPregnant: true,
    gestationalWeeks: 24,
    emergencyContactPhone: '+233244123456'
  }
};

if (!state.userId) {
  state.userId = 'demo-patient-001';
}

SpeechService.autoSpeak = state.autoSpeak !== false;

function saveAppState() {
  try {
    localStorage.setItem('lily_app_state', JSON.stringify({
      userId: state.userId,
      language: state.language,
      autoSpeak: state.autoSpeak,
      profile: state.profile
    }));
  } catch (e) {}
}

const views = {
  onboarding: OnboardingView,
  dashboard: DashboardView,
  chat: ChatView,
  triage: TriageView,
  herbal: HerbalView,
  vitals: VitalsView,
  maternal: MaternalView
};

function initApp() {
  const container = document.getElementById('view-container');
  const syncPill = document.getElementById('sync-status-pill');
  const syncText = document.getElementById('sync-status-text');
  const autoSpeakBtn = document.getElementById('btn-toggle-autospeak');

  // Check health status to set sync status pill
  async function checkConnection() {
    const health = await API.getHealth();
    if (health.success) {
      state.isOnline = true;
      syncPill.className = 'sync-pill online';
      syncText.textContent = 'Synced with Cloud';
    } else {
      state.isOnline = false;
      syncPill.className = 'sync-pill offline';
      syncText.textContent = 'Saved On-Device - Offline';
    }
  }
  checkConnection();
  setInterval(checkConnection, 10000);

  // Router function
  function navigateTo(viewName) {
    if (!views[viewName]) return;
    state.activeView = viewName;

    // Stop any playing speech on navigation
    SpeechService.stop();

    // Update nav tab highlights
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    const targetView = views[viewName];
    container.innerHTML = targetView.render(state);
    saveAppState();
    targetView.bindEvents(container, state, navigateTo, API);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bind Header Language Switch Toggle Bar
  const btnTwi = document.getElementById('toggle-lang-twi');
  const btnEng = document.getElementById('toggle-lang-eng');
  const btnBoth = document.getElementById('toggle-lang-both');

  function updateLangToggleUI() {
    btnTwi?.classList.toggle('active', state.language === 'twi');
    btnEng?.classList.toggle('active', state.language === 'english');
    btnBoth?.classList.toggle('active', state.language === 'dual');
  }
  updateLangToggleUI();

  btnTwi?.addEventListener('click', () => {
    state.language = 'twi';
    updateLangToggleUI();
    navigateTo(state.activeView);
  });

  btnEng?.addEventListener('click', () => {
    state.language = 'english';
    updateLangToggleUI();
    navigateTo(state.activeView);
  });

  btnBoth?.addEventListener('click', () => {
    state.language = 'dual';
    updateLangToggleUI();
    navigateTo(state.activeView);
  });

  // Bind Header Auto-Speak Toggle Button
  function updateAutoSpeakUI() {
    if (autoSpeakBtn) {
      if (SpeechService.autoSpeak) {
        autoSpeakBtn.innerHTML = '🔊 AI Speaks Back: ON';
        autoSpeakBtn.style.color = 'var(--primary)';
        autoSpeakBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        autoSpeakBtn.innerHTML = '🔇 AI Speaks Back: OFF';
        autoSpeakBtn.style.color = 'var(--text-muted)';
        autoSpeakBtn.style.borderColor = 'var(--border-card)';
      }
    }
  }
  updateAutoSpeakUI();

  autoSpeakBtn?.addEventListener('click', () => {
    SpeechService.autoSpeak = !SpeechService.autoSpeak;
    state.autoSpeak = SpeechService.autoSpeak;
    if (!SpeechService.autoSpeak) {
      SpeechService.stop();
    }
    updateAutoSpeakUI();
    saveAppState();
  });

  // Bind Header Voice Gender Toggle Button (Female / Male)
  const voiceGenderBtn = document.getElementById('btn-toggle-voice-gender');

  function updateVoiceGenderHeaderUI() {
    if (voiceGenderBtn) {
      if (SpeechService.voiceGender === 'female') {
        voiceGenderBtn.innerHTML = '👩 Female Voice';
        voiceGenderBtn.style.color = '#f472b6';
        voiceGenderBtn.style.borderColor = 'rgba(236, 72, 153, 0.4)';
      } else {
        voiceGenderBtn.innerHTML = '👨 Male Voice';
        voiceGenderBtn.style.color = '#60a5fa';
        voiceGenderBtn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
      }
    }
  }
  updateVoiceGenderHeaderUI();

  voiceGenderBtn?.addEventListener('click', () => {
    SpeechService.voiceGender = SpeechService.voiceGender === 'female' ? 'male' : 'female';
    state.voiceGender = SpeechService.voiceGender;
    updateVoiceGenderHeaderUI();
    saveAppState();
    // Re-render current view to update gender buttons UI
    navigateTo(state.activeView);
  });

  // Bind Bottom Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      navigateTo(view);
    });
  });

  // Bind Header Profile Avatar / Settings
  document.getElementById('btn-onboarding-link')?.addEventListener('click', () => {
    navigateTo('onboarding');
  });

  // Initial navigation
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);
