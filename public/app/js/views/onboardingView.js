/**
 * Screen 1: Onboarding & Language/Profile Setup View
 */
export const OnboardingView = {
  render(state) {
    return `
      <div class="card" style="max-width: 600px; margin: 2rem auto;">
        <div class="card-title">
          <span>⚙️</span> Welcome to The Guided Health Companion
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
          Akwaaba! Select your preferred language and fill in your details for personalized health guidance.
        </p>

        <!-- Language Selector -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">
          Select Language / Paw Kasa:
        </label>
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <button type="button" id="btn-lang-twi" class="btn ${state.language === 'twi' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1;">
            🎙️ Twi (Akan)
          </button>
          <button type="button" id="btn-lang-eng" class="btn ${state.language === 'english' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1;">
            🗣️ Simple English
          </button>
        </div>

        <!-- Profile Inputs -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">Full Name:</label>
        <input type="text" id="input-name" class="input-field" value="${state.profile.fullName || 'Abena Osei'}" placeholder="Enter full name" />

        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">Are you currently pregnant?</label>
        <select id="select-pregnant" class="select-field">
          <option value="yes" ${state.profile.isPregnant ? 'selected' : ''}>Yes, Currently Pregnant (Nyinsɛn)</option>
          <option value="no" ${!state.profile.isPregnant ? 'selected' : ''}>No (Mother / Caregiver)</option>
        </select>

        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">Gestational Age (Weeks):</label>
        <input type="number" id="input-weeks" class="input-field" value="${state.profile.gestationalWeeks || 24}" min="1" max="42" />

        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">Emergency Contact Phone:</label>
        <input type="tel" id="input-phone" class="input-field" value="${state.profile.emergencyContactPhone || '+233244123456'}" placeholder="+233..." />

        <!-- Offline Data Storage Notice -->
        <div class="status-banner safe" style="margin-top: 1rem;">
          <span>🔒</span>
          <div>
            <strong>100% Offline-First Data Privacy</strong><br>
            All health records, vitals, and triage logs are saved securely on your device.
          </div>
        </div>

        <button id="btn-save-onboarding" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
          Continue to Dashboard &rarr;
        </button>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    container.querySelector('#btn-lang-twi')?.addEventListener('click', () => {
      state.language = 'twi';
      this.refresh(container, state, onNavigate, api);
    });

    container.querySelector('#btn-lang-eng')?.addEventListener('click', () => {
      state.language = 'english';
      this.refresh(container, state, onNavigate, api);
    });

    container.querySelector('#btn-save-onboarding')?.addEventListener('click', async () => {
      const name = container.querySelector('#input-name').value;
      const isPregnant = container.querySelector('#select-pregnant').value === 'yes';
      const weeks = parseInt(container.querySelector('#input-weeks').value) || 24;
      const phone = container.querySelector('#input-phone').value;

      const profile = {
        userId: state.userId,
        fullName: name,
        languagePreference: state.language,
        isPregnant,
        gestationalWeeks: weeks,
        emergencyContactPhone: phone
      };

      if (api && api.saveProfile) {
        await api.saveProfile(profile);
      }
      onNavigate('dashboard');
    });
  },

  refresh(container, state, onNavigate, api) {
    container.innerHTML = this.render(state);
    this.bindEvents(container, state, onNavigate, api);
  }
};
