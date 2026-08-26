/**
 * Screen 4 & 4b: Offline Symptom Triage & Red-Flag Emergency Alert Modal View
 */
export const TriageView = {
  render(state) {
    return `
      <div class="card">
        <div class="card-title">
          <span>🚨</span> Offline Symptom Checker & Emergency Triage
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Select any symptoms you or your baby are experiencing for instant on-device safety evaluation.
        </p>

        <!-- Interactive Symptom Checkboxes Grid -->
        <div class="grid-2" style="margin-bottom: 1.5rem;">
          <div class="checklist-item">
            <input type="checkbox" id="sym-bleeding" value="severe_vaginal_bleeding" />
            <label for="sym-bleeding" style="font-size: 0.9rem; cursor: pointer;">
              <strong style="color: var(--danger);">🔴 Severe Vaginal Bleeding</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Mogya mmoa tumi firi mu pii</span>
            </label>
          </div>

          <div class="checklist-item">
            <input type="checkbox" id="sym-fever" value="high_infant_fever" />
            <label for="sym-fever" style="font-size: 0.9rem; cursor: pointer;">
              <strong style="color: var(--danger);">🔴 High Infant Fever (>38.5°C)</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Akwadaa ho yɛ hye pa ara</span>
            </label>
          </div>

          <div class="checklist-item">
            <input type="checkbox" id="sym-headache" value="severe_headache_blurred_vision" />
            <label for="sym-headache" style="font-size: 0.9rem; cursor: pointer;">
              <strong style="color: var(--danger);">🔴 Severe Headache & Vision Changes</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Tiri yareɛ ne ani so wusuwusu</span>
            </label>
          </div>

          <div class="checklist-item">
            <input type="checkbox" id="sym-movement" value="reduced_fetal_movement" />
            <label for="sym-movement" style="font-size: 0.9rem; cursor: pointer;">
              <strong>🟡 Reduced Fetal Movement</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Abofra ammwosow dɔnhwerew mu</span>
            </label>
          </div>

          <div class="checklist-item">
            <input type="checkbox" id="sym-morning" value="mild_morning_sickness" />
            <label for="sym-morning" style="font-size: 0.9rem; cursor: pointer;">
              <strong>🟢 Mild Nausea / Morning Sickness</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Anopa ho a ɛyɛ tan</span>
            </label>
          </div>

          <div class="checklist-item">
            <input type="checkbox" id="sym-feet" value="swollen_feet_mild" />
            <label for="sym-feet" style="font-size: 0.9rem; cursor: pointer;">
              <strong>🟡 Mild Swollen Feet (Edema)</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Nan a ahon kakra</span>
            </label>
          </div>
        </div>

        <button id="btn-run-triage" class="btn btn-primary" style="width: 100%;">
          Evaluate Symptoms On-Device &rarr;
        </button>

        <!-- Triage Result Container -->
        <div id="triage-result-box" style="margin-top: 1.5rem; display: none;"></div>
      </div>

      <!-- Screen 4b: Emergency Red-Flag Alert Modal Overlay -->
      <div id="emergency-modal-overlay" class="modal-overlay" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <span>🚨</span> RED-FLAG MEDICAL EMERGENCY
          </div>
          <div id="modal-danger-body" style="font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">
            <!-- Dynamic emergency content injected here -->
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="btn-modal-call" class="btn btn-primary" style="background: var(--danger); flex: 1;">
              📞 Call Emergency Hotline
            </button>
            <button id="btn-modal-close" class="btn btn-secondary">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const runBtn = container.querySelector('#btn-run-triage');
    const resultBox = container.querySelector('#triage-result-box');
    const modalOverlay = container.querySelector('#emergency-modal-overlay');
    const modalBody = container.querySelector('#modal-danger-body');
    const closeBtn = container.querySelector('#btn-modal-close');

    runBtn?.addEventListener('click', async () => {
      const selected = [];
      container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selected.push(cb.value);
      });

      if (selected.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `<div class="status-banner caution">Please select at least one symptom to evaluate.</div>`;
        return;
      }

      const res = await api.evaluateTriage({ symptomKeys: selected });
      if (res.success && res.data) {
        const data = res.data;
        resultBox.style.display = 'block';

        const statusClass = data.highestSeverity === 'HIGH' ? 'danger' : data.highestSeverity === 'MODERATE' ? 'caution' : 'safe';

        resultBox.innerHTML = `
          <div class="status-banner ${statusClass}">
            <div style="font-size: 1.25rem;">${data.isRedFlag ? '🚨' : 'ℹ️'}</div>
            <div>
              <strong>Triage Evaluation: Severity Level ${data.highestSeverity}</strong><br>
              ${data.emergencyNoticeEnglish}<br><br>
              <strong>Twi Action:</strong> ${data.emergencyNoticeTwi}
            </div>
          </div>
        `;

        // Trigger Screen 4b Full-Screen Red Alert Modal if Red-Flag
        if (data.isRedFlag) {
          modalBody.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); padding: 1rem; border-radius: 8px; border: 1px solid var(--danger); margin-bottom: 1rem;">
              <strong>CRITICAL DANGER ALERT / KƆ ASIBITI NTEMPA!</strong><br>
              One or more symptoms selected require immediate urgent referral to the nearest hospital.
            </div>
            <strong>English:</strong> ${data.emergencyNoticeEnglish}<br><br>
            <strong>Twi (Akan):</strong> ${data.emergencyNoticeTwi}<br><br>
            <strong>Action Steps:</strong><br>
            1. Proceed IMMEDIATELY to the nearest Ghana Health Service clinic/hospital.<br>
            2. Take your Antenatal Card (ANC book) and emergency contact.<br>
            3. Do not delay or wait at home.
          `;
          modalOverlay.style.display = 'flex';
        }
      }
    });

    closeBtn?.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
    });
  }
};
