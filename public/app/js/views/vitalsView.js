/**
 * Screen 6: Vitals Logging & Offline Health Journal View
 */
export const VitalsView = {
  render(state) {
    return `
      <div class="card">
        <div class="card-title">
          <span>🩺</span> Vitals Checking & Health Monitoring
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Enter your daily health numbers to monitor blood pressure, temperature, and pregnancy health trends.
        </p>

        <!-- Vitals Input Form -->
        <div class="grid-2">
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Systolic Blood Pressure (mmHg):</label>
            <input type="number" id="vital-sys" class="input-field" placeholder="e.g. 120" value="145" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Diastolic Blood Pressure (mmHg):</label>
            <input type="number" id="vital-dia" class="input-field" placeholder="e.g. 80" value="95" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Body Temperature (°C):</label>
            <input type="number" step="0.1" id="vital-temp" class="input-field" placeholder="e.g. 36.8" value="37.2" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Weight (kg):</label>
            <input type="number" step="0.1" id="vital-weight" class="input-field" placeholder="e.g. 68.5" value="69.0" />
          </div>
        </div>

        <button id="btn-log-vitals" class="btn btn-primary" style="width: 100%;">
          Save Vitals & Evaluate Status &rarr;
        </button>

        <!-- Evaluation Container -->
        <div id="vitals-result-box" style="margin-top: 1.25rem;"></div>
      </div>

      <!-- Offline Health Journal Section -->
      <div class="card">
        <div class="card-title">
          <span>📓</span> Daily Health Journal & Notes
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Record how you feel today. All entries are saved locally on your phone.
        </p>

        <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Mood / Physical Feeling:</label>
        <select id="journal-mood" class="select-field">
          <option value="good">😊 Feeling Good & Healthy</option>
          <option value="tired">😴 Tired / Needs Rest</option>
          <option value="nauseous">🤢 Mild Morning Sickness</option>
          <option value="anxious">Worried / Needs Guidance</option>
        </select>

        <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Daily Note / Symptoms Observed:</label>
        <textarea id="journal-text" class="input-field" style="height: 90px; resize: vertical;" placeholder="Write any pregnancy symptoms, baby movement notes, or feelings..."></textarea>

        <button id="btn-save-journal" class="btn btn-secondary" style="width: 100%;">
          💾 Save Daily Journal Entry
        </button>

        <div id="journal-status-box" style="margin-top: 0.75rem;"></div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const logBtn = container.querySelector('#btn-log-vitals');
    const resultBox = container.querySelector('#vitals-result-box');
    const saveJournalBtn = container.querySelector('#btn-save-journal');
    const journalStatusBox = container.querySelector('#journal-status-box');

    logBtn?.addEventListener('click', async () => {
      const sys = parseInt(container.querySelector('#vital-sys').value) || undefined;
      const dia = parseInt(container.querySelector('#vital-dia').value) || undefined;
      const temp = parseFloat(container.querySelector('#vital-temp').value) || undefined;
      const weight = parseFloat(container.querySelector('#vital-weight').value) || undefined;

      const res = await api.logVitals({
        userId: state.userId,
        systolicBp: sys,
        diastolicBp: dia,
        bodyTemperature: temp,
        weightKg: weight
      });

      if (res.success && res.data) {
        const d = res.data;
        const statusClass = d.vitalStatus === 'HIGH_WARNING' ? 'danger' : d.vitalStatus === 'ELEVATED' ? 'caution' : 'safe';

        resultBox.innerHTML = `
          <div class="status-banner ${statusClass}">
            <div>
              <strong>Vitals Status: ${d.vitalStatus}</strong><br>
              ${d.alerts.join('<br>')}<br><br>
              <strong>Twi Alert:</strong> ${d.alertsTwi.join('<br>')}
            </div>
          </div>
        `;
      }
    });

    saveJournalBtn?.addEventListener('click', async () => {
      const mood = container.querySelector('#journal-mood').value;
      const text = container.querySelector('#journal-text').value;

      const res = await api.saveHealthJournal({
        userId: state.userId,
        symptoms: ['fatigue'],
        mood,
        notesText: text
      });

      if (res.success) {
        journalStatusBox.innerHTML = `
          <div class="status-banner safe" style="margin-bottom: 0;">
            ✓ Journal entry saved on-device locally (${res.data.entryDate}).
          </div>
        `;
      }
    });
  }
};
