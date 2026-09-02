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
          Enter your daily health numbers to monitor blood pressure, temperature, pulse, and pregnancy health trends.
        </p>

        <!-- Vitals Input Form -->
        <div class="grid-2">
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Systolic Blood Pressure (mmHg):</label>
            <input type="number" id="vital-sys" class="input-field" placeholder="e.g. 120" value="" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Diastolic Blood Pressure (mmHg):</label>
            <input type="number" id="vital-dia" class="input-field" placeholder="e.g. 80" value="" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Body Temperature (°C):</label>
            <input type="number" step="0.1" id="vital-temp" class="input-field" placeholder="e.g. 36.6" value="" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Pulse Rate (bpm):</label>
            <input type="number" id="vital-pulse" class="input-field" placeholder="e.g. 72" value="" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Blood Glucose (mmol/L):</label>
            <input type="number" step="0.1" id="vital-glucose" class="input-field" placeholder="e.g. 5.5" value="" />
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Weight (kg):</label>
            <input type="number" step="0.1" id="vital-weight" class="input-field" placeholder="e.g. 65.0" value="" />
          </div>
        </div>

        <button id="btn-log-vitals" class="btn btn-primary" style="width: 100%;">
          Save Vitals & Evaluate Status &rarr;
        </button>

        <!-- Evaluation Container -->
        <div id="vitals-result-box" style="margin-top: 1.25rem;"></div>
      </div>

      <!-- Past Vitals History Section -->
      <div class="card">
        <div class="card-title">
          <span>📊</span> Logged Vitals History
        </div>
        <div id="vitals-history-container">
          <div style="color: var(--text-muted); font-size: 0.85rem;">Loading vitals history...</div>
        </div>
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

        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-card);">
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.75rem;">Past Journal Entries:</div>
          <div id="journal-history-container">
            <div style="color: var(--text-muted); font-size: 0.85rem;">Loading journal history...</div>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const logBtn = container.querySelector('#btn-log-vitals');
    const resultBox = container.querySelector('#vitals-result-box');
    const historyContainer = container.querySelector('#vitals-history-container');
    const journalContainer = container.querySelector('#journal-history-container');
    const saveJournalBtn = container.querySelector('#btn-save-journal');
    const journalStatusBox = container.querySelector('#journal-status-box');

    async function refreshHistory() {
      // 1. Fetch Vitals Logs
      const vitRes = await api.getVitalsHistory(state.userId);
      if (vitRes.success && vitRes.data && vitRes.data.length > 0) {
        historyContainer.innerHTML = vitRes.data.map(log => `
          <div class="checklist-item" style="border-left: 4px solid ${log.vital_status === 'HIGH_WARNING' ? 'var(--danger)' : log.vital_status === 'ELEVATED' ? 'var(--warning)' : 'var(--primary)'};">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">
                ${log.systolic_bp && log.diastolic_bp ? `BP: ${log.systolic_bp}/${log.diastolic_bp} mmHg ` : ''}
                ${log.body_temperature ? `| Temp: ${log.body_temperature}°C ` : ''}
                ${log.pulse_rate ? `| Pulse: ${log.pulse_rate} bpm ` : ''}
                ${log.weight_kg ? `| Wt: ${log.weight_kg} kg` : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Status: <strong>${log.vital_status}</strong> | Recorded: ${new Date(log.logged_at).toLocaleString()}
              </div>
            </div>
          </div>
        `).join('');
      } else {
        historyContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No vitals logged yet. Use the form above to record readings.</div>`;
      }

      // 2. Fetch Journal History
      const jrnRes = await api.getJournalHistory ? await api.getJournalHistory(state.userId) : { success: false };
      if (jrnRes.success && jrnRes.data && jrnRes.data.length > 0) {
        journalContainer.innerHTML = jrnRes.data.map(j => `
          <div style="background: rgba(15, 23, 42, 0.6); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card); margin-bottom: 0.5rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--primary); margin-bottom: 0.3rem;">
              <span>📅 ${j.entry_date}</span>
              <span style="text-transform: capitalize;">Mood: ${j.mood}</span>
            </div>
            <div>${j.notes_text || 'No text note'}</div>
          </div>
        `).join('');
      } else {
        journalContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No past journal entries yet.</div>`;
      }
    }

    refreshHistory();

    logBtn?.addEventListener('click', async () => {
      const sys = parseInt(container.querySelector('#vital-sys').value) || undefined;
      const dia = parseInt(container.querySelector('#vital-dia').value) || undefined;
      const temp = parseFloat(container.querySelector('#vital-temp').value) || undefined;
      const pulse = parseInt(container.querySelector('#vital-pulse').value) || undefined;
      const glucose = parseFloat(container.querySelector('#vital-glucose').value) || undefined;
      const weight = parseFloat(container.querySelector('#vital-weight').value) || undefined;

      const res = await api.logVitals({
        userId: state.userId,
        systolicBp: sys,
        diastolicBp: dia,
        bodyTemperature: temp,
        pulseRate: pulse,
        bloodGlucose: glucose,
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

        refreshHistory();
      }
    });

    saveJournalBtn?.addEventListener('click', async () => {
      const mood = container.querySelector('#journal-mood').value;
      const text = container.querySelector('#journal-text').value;

      if (!text.trim()) return;

      const res = await api.saveHealthJournal({
        userId: state.userId,
        symptoms: ['logged'],
        mood,
        notesText: text
      });

      if (res.success) {
        journalStatusBox.innerHTML = `
          <div class="status-banner safe" style="margin-bottom: 0;">
            ✓ Journal entry saved on-device locally (${res.data.entryDate}).
          </div>
        `;
        container.querySelector('#journal-text').value = '';
        refreshHistory();
      }
    });
  }
};

