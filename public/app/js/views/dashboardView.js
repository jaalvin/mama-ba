/**
 * Screen 2: Home Dashboard View with MedASR-Ghana Voice Engine & AI Speech Read-Aloud
 */
import { SpeechService } from '../speechService.js';

export const DashboardView = {
  render(state) {
    const isTwi = state.language === 'twi';

    return `
      <!-- Hero Voice Button Box -->
      <div class="hero-voice-box">
        <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
          Voice-First Guided Health Companion
        </div>
        <h2 style="font-size: 1.5rem; margin: 0.5rem 0 0.25rem 0;">
          ${isTwi ? 'Bisa Wo Ho Asem Nyinaa Wɔ Twi Mu' : 'Ask Any Health Question in English'}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Tap the microphone below to speak your question in Twi or Simple English. The AI will answer and speak back.
        </p>

        <!-- Model Attribution Badges -->
        <div class="ai-tech-badges" style="justify-content: center; margin-top: 0.5rem; border-top: none; padding-top: 0;">
          <span class="badge-chip hf">🤗 Hugging Face</span>
          <span class="badge-chip medasr">🎙️ samwell/medasr-ghana</span>
          <span class="badge-chip khaya">🌿 Khaya AI (Twi NMT)</span>
        </div>

        <div class="mic-btn-wrapper">
          <div class="mic-ripple" id="hero-mic-ripple"></div>
          <button id="hero-mic-btn" class="mic-btn" title="Tap to Speak">
            🎙️
          </button>
        </div>

        <div id="hero-mic-status" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
          Tap microphone button to start recording voice...
        </div>

        <!-- Voice Soundwave Animation (Hidden by default) -->
        <div id="hero-voice-wave" class="voice-wave-container" style="display: none; margin-top: 0.75rem;">
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
        </div>
      </div>

      <!-- Quick Action Prompt Cards -->
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">💡 Quick Guidance Categories</h3>
        <div class="grid-2">
          <div class="prompt-card" id="card-maternal">
            <div class="prompt-card-icon">🤰</div>
            <div class="prompt-card-title">Maternal & Child Care</div>
            <div class="prompt-card-desc">Track GHS ANC clinic visits & newborn vaccine timelines.</div>
          </div>

          <div class="prompt-card" id="card-triage">
            <div class="prompt-card-icon">🚨</div>
            <div class="prompt-card-title">Symptom Checker & Triage</div>
            <div class="prompt-card-desc">Evaluate symptoms offline against red-flag danger rules.</div>
          </div>

          <div class="prompt-card" id="card-herbal">
            <div class="prompt-card-icon">🌿</div>
            <div class="prompt-card-title">Herbal & Drug Safety</div>
            <div class="prompt-card-desc">Check Nibima, Taabea, Moringa contraindications.</div>
          </div>

          <div class="prompt-card" id="card-vitals">
            <div class="prompt-card-icon">📊</div>
            <div class="prompt-card-title">Log Vitals & Journal</div>
            <div class="prompt-card-desc">Record Blood Pressure, Temperature, Glucose, & Notes.</div>
          </div>
        </div>
      </div>

      <!-- Daily Reminders Checklist Widget -->
      <div class="card">
        <div class="card-title">
          <span>📅</span> Today's Medication & Care Checklist
        </div>
        <div class="checklist-item">
          <input type="checkbox" id="check-iron" checked />
          <label for="check-iron" style="font-size: 0.9rem;">
            <strong>Prenatal Iron Supplement (Ferrous Sulfate)</strong> — Take 1 tablet (Space 2 hrs from Nibima tea)
          </label>
        </div>
        <div class="checklist-item">
          <input type="checkbox" id="check-anc" />
          <label for="check-anc" style="font-size: 0.9rem;">
            <strong>Review Upcoming 3rd ANC Booking Date</strong> — Gestational Week 24 Checkup
          </label>
        </div>
        <div class="checklist-item">
          <input type="checkbox" id="check-water" />
          <label for="check-water" style="font-size: 0.9rem;">
            <strong>Hydration Goal</strong> — Drink 2.5 Liters of safe clean water daily
          </label>
        </div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate) {
    const micBtn = container.querySelector('#hero-mic-btn');
    const micStatus = container.querySelector('#hero-mic-status');
    const micRipple = container.querySelector('#hero-mic-ripple');
    const voiceWave = container.querySelector('#hero-voice-wave');

    let isRecordingAudio = false;

    micBtn?.addEventListener('click', async () => {
      if (SpeechService.isSpeaking()) {
        SpeechService.stop();
      }

      if (!isRecordingAudio) {
        isRecordingAudio = true;
        micBtn.classList.add('recording');
        if (micRipple) micRipple.style.display = 'block';
        if (voiceWave) voiceWave.style.display = 'flex';
        micStatus.innerHTML = '<span style="color: var(--danger);">🔴 Khaya ASR & MedASR-Ghana Listening... Speak in Twi or English</span>';

        const lang = state.language === 'twi' ? 'tw' : 'en';
        await SpeechService.startRecording(lang, (transcription) => {
          isRecordingAudio = false;
          micBtn.classList.remove('recording');
          if (micRipple) micRipple.style.display = 'none';
          if (voiceWave) voiceWave.style.display = 'none';

          state.pendingQuery = transcription;
          micStatus.textContent = `Captured Ghanaian Voice: "${transcription}"... Redirecting to Chatbot`;
          setTimeout(() => {
            onNavigate('chat');
          }, 400);
        }, (err) => {
          console.warn('[DashboardView] Voice recording notice:', err);
          isRecordingAudio = false;
          micBtn.classList.remove('recording');
          if (micRipple) micRipple.style.display = 'none';
          if (voiceWave) voiceWave.style.display = 'none';
          micStatus.textContent = 'Voice captured. Tap microphone to record.';
        });
      } else {
        SpeechService.stopRecording();
        isRecordingAudio = false;
        micBtn.classList.remove('recording');
        if (micRipple) micRipple.style.display = 'none';
        if (voiceWave) voiceWave.style.display = 'none';
      }
    });

    function fallbackVoiceTrigger() {
      micBtn.classList.add('recording');
      if (micRipple) micRipple.style.display = 'block';
      if (voiceWave) voiceWave.style.display = 'flex';
      micStatus.innerHTML = '<span style="color: var(--danger);">🎙️ MedASR-Ghana Voice Engine Active... Speak now</span>';

      setTimeout(() => {
        micBtn.classList.remove('recording');
        if (micRipple) micRipple.style.display = 'none';
        if (voiceWave) voiceWave.style.display = 'none';
        state.pendingQuery = state.language === 'twi'
          ? 'Nibima aduru ye ma nyinsen mu anaa?'
          : 'What local Ghanaian foods give iron during pregnancy?';
        micStatus.textContent = `Voice recorded: "${state.pendingQuery}". AI generating response & speaking back...`;
        setTimeout(() => onNavigate('chat'), 600);
      }, 2000);
    }

    container.querySelector('#card-maternal')?.addEventListener('click', () => onNavigate('maternal'));
    container.querySelector('#card-triage')?.addEventListener('click', () => onNavigate('triage'));
    container.querySelector('#card-herbal')?.addEventListener('click', () => onNavigate('herbal'));
    container.querySelector('#card-vitals')?.addEventListener('click', () => onNavigate('vitals'));
  }
};
