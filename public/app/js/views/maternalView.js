/**
 * Screen 7: Maternal ANC & Childhood Immunization Care Tracker View
 */
export const MaternalView = {
  render(state) {
    return `
      <!-- GHS Antenatal Care (ANC) Timeline -->
      <div class="card">
        <div class="card-title">
          <span>🤰</span> Ghana Health Service (GHS) ANC Care Timeline
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Recommended clinic booking visits aligned with GHS and WHO maternal guidelines.
        </p>

        <div id="anc-timeline-container">
          <div style="color: var(--text-muted); font-size: 0.85rem;">Loading ANC visit timeline...</div>
        </div>
      </div>

      <!-- Childhood Immunization Schedule -->
      <div class="card">
        <div class="card-title">
          <span>👶</span> Childhood Immunization Vaccine Tracker
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Standard birth to 9-month immunization schedule (BCG, Polio, Penta, Rota, Measles-Rubella).
        </p>

        <div id="immunization-container">
          <div style="color: var(--text-muted); font-size: 0.85rem;">Loading immunization schedule...</div>
        </div>
      </div>
    `;
  },

  async bindEvents(container, state, onNavigate, api) {
    const ancContainer = container.querySelector('#anc-timeline-container');
    const immContainer = container.querySelector('#immunization-container');

    // 1. Fetch ANC Schedule
    const ancRes = await api.getANCSchedule({
      gestationalWeeks: state.profile.gestationalWeeks || 10,
      dueDate: state.profile.dueDate || '2026-11-20'
    });

    if (ancRes.success && ancRes.data) {
      ancContainer.innerHTML = ancRes.data.map(visit => `
        <div class="checklist-item" style="border-left: 4px solid ${visit.isCompleted ? 'var(--primary)' : 'var(--accent-blue)'};">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">
              Visit ${visit.visitNumber}: ${visit.titleEnglish} (${visit.recommendedWeeks} Weeks)
            </div>
            <div style="font-size: 0.8rem; color: var(--primary); margin: 0.2rem 0;">
              🇬🇭 ${visit.titleTwi}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ${visit.descriptionEnglish}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.3rem;">
              Target Date: <strong>${visit.dueDate}</strong> | Status: ${visit.isCompleted ? '✅ Completed' : '📅 Upcoming'}
            </div>
          </div>
        </div>
      `).join('');
    }

    // 2. Fetch Immunization Schedule
    const immRes = await api.getImmunizationSchedule({
      childBirthDate: state.profile.childBirthDate || '2026-01-01'
    });

    if (immRes.success && immRes.data) {
      immContainer.innerHTML = immRes.data.map(imm => `
        <div class="checklist-item" style="border-left: 4px solid var(--accent-purple);">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">
              💉 ${imm.titleEnglish} [${imm.ageDescriptionEnglish}]
            </div>
            <div style="font-size: 0.8rem; color: var(--accent-purple); margin: 0.2rem 0;">
              🇬🇭 ${imm.titleTwi} (${imm.ageDescriptionTwi})
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ${imm.descriptionEnglish}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.3rem;">
              Scheduled Date: <strong>${imm.dueDate}</strong>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
};
