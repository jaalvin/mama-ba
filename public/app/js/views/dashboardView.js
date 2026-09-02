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
          <span class="badge-chip hf">🤖 Gemini & Groq Medical AI</span>
          <span class="badge-chip medasr">🎙️ Abena AI (Fluent Twi Speech & ASR)</span>
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div class="card-title" style="margin-bottom: 0;">
            <span>📅</span> Today's Medication & Care Checklist
          </div>
          <button id="btn-toggle-reminder-form" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">
            + Add Reminder
          </button>
        </div>

        <!-- Add Reminder Drawer -->
        <div id="add-reminder-drawer" style="display: none; background: rgba(15, 23, 42, 0.5); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card); margin-bottom: 1rem;">
          <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;">Create New Medication Reminder:</div>
          <input type="text" id="new-rem-title" class="input-field" placeholder="Medication name (e.g. Iron & Folic Acid)..." style="font-size: 0.85rem;" />
          <div class="grid-2" style="margin-top: 0.5rem;">
            <input type="time" id="new-rem-time" class="input-field" value="08:00" style="font-size: 0.85rem;" />
            <input type="text" id="new-rem-dosage" class="input-field" placeholder="Dosage (e.g. 1 Tablet)..." style="font-size: 0.85rem;" />
          </div>
          <button id="btn-save-new-reminder" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; font-size: 0.85rem;">
            Save Reminder to Database
          </button>
        </div>

        <div id="dashboard-reminders-list">
          <div style="color: var(--text-muted); font-size: 0.85rem;">Loading daily reminders...</div>
        </div>
      </div>
    `;
  },

  async bindEvents(container, state, onNavigate, api) {
    const micBtn = container.querySelector('#hero-mic-btn');
    const micStatus = container.querySelector('#hero-mic-status');
    const micRipple = container.querySelector('#hero-mic-ripple');
    const voiceWave = container.querySelector('#hero-voice-wave');
    const remindersList = container.querySelector('#dashboard-reminders-list');
    const drawer = container.querySelector('#add-reminder-drawer');
    const toggleFormBtn = container.querySelector('#btn-toggle-reminder-form');
    const saveRemBtn = container.querySelector('#btn-save-new-reminder');

    // Load Reminders
    async function loadReminders() {
      if (!api || !api.getReminders) return;
      const res = await api.getReminders(state.userId);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          remindersList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No reminders set for today. Tap "+ Add Reminder" above.</div>`;
          return;
        }

        remindersList.innerHTML = res.data.map(rem => `
          <div class="checklist-item" style="display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${rem.isCompleted ? 'var(--primary)' : 'var(--accent-orange)'};">
            <div style="display: flex; gap: 0.5rem; align-items: flex-start; flex: 1;">
              <input type="checkbox" class="rem-toggle-cb" data-id="${rem.id}" ${rem.isCompleted ? 'checked' : ''} style="margin-top: 0.2rem; cursor: pointer;" />
              <div>
                <strong style="${rem.isCompleted ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${rem.title}</strong><br>
                <span style="font-size: 0.8rem; color: var(--text-muted);">
                  ⏰ ${rem.scheduledTime} ${rem.dosageInfo ? `• ${rem.dosageInfo}` : ''}
                </span>
              </div>
            </div>
            <button class="rem-delete-btn" data-id="${rem.id}" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 1rem; padding: 0.2rem 0.5rem;">
              🗑️
            </button>
          </div>
        `).join('');

        // Bind checkbox clicks
        remindersList.querySelectorAll('.rem-toggle-cb').forEach(cb => {
          cb.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const isNowDone = e.target.checked;
            await api.toggleReminder(id, { isCompleted: isNowDone });
            loadReminders();
          });
        });

        // Bind delete clicks
        remindersList.querySelectorAll('.rem-delete-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            await api.deleteReminder(id);
            loadReminders();
          });
        });
      }
    }

    loadReminders();

    toggleFormBtn?.addEventListener('click', () => {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    });

    saveRemBtn?.addEventListener('click', async () => {
      const title = container.querySelector('#new-rem-title').value.trim();
      const scheduledTime = container.querySelector('#new-rem-time').value;
      const dosageInfo = container.querySelector('#new-rem-dosage').value.trim();

      if (!title) return;

      await api.createReminder({
        userId: state.userId,
        title,
        reminderType: 'MEDICATION',
        scheduledTime,
        recurrence: 'DAILY',
        dosageInfo: dosageInfo || '1 Tablet'
      });

      container.querySelector('#new-rem-title').value = '';
      drawer.style.display = 'none';
      loadReminders();
    });

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
        micStatus.innerHTML = '<span style="color: var(--danger);">🔴 Abena AI Speech Recognition Listening... Speak in Twi or English</span>';

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

    container.querySelector('#card-maternal')?.addEventListener('click', () => onNavigate('maternal'));
    container.querySelector('#card-triage')?.addEventListener('click', () => onNavigate('triage'));
    container.querySelector('#card-herbal')?.addEventListener('click', () => onNavigate('herbal'));
    container.querySelector('#card-vitals')?.addEventListener('click', () => onNavigate('vitals'));
  }
};

