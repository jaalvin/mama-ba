/**
 * Screen 7: Maternal ANC & Childhood Immunization Care Tracker View
 */
export const MaternalView = {
  render(state) {
    const isTwi = state.language === 'twi';
    const weeks = state.profile.gestationalWeeks || 24;
    const dueDate = state.profile.dueDate || '2026-11-20';
    const childBirthDate = state.profile.childBirthDate || '2026-01-01';

    return `
      <!-- Personal Care Setup Box -->
      <div class="card">
        <div class="card-title">
          <span>✨</span> ${isTwi ? 'Sesamu Nyinsɛn Ne Abofra Nhyehyɛeɛ' : 'Personalize Care Schedule'}
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Enter pregnancy age or due date to generate tailored GHS clinic visits and vaccine schedules.
        </p>

        <form id="maternal-setup-form">
          <div class="grid-2">
            <div>
              <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">
                Gestational Age (Weeks):
              </label>
              <input type="number" id="input-maternal-weeks" class="input-field" min="1" max="42" value="${weeks}" />
            </div>

            <div>
              <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">
                Expected Due Date:
              </label>
              <input type="date" id="input-maternal-duedate" class="input-field" value="${dueDate}" />
            </div>
          </div>

          <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">
            Child's Date of Birth (for Vaccine Schedule):
          </label>
          <input type="date" id="input-maternal-childdob" class="input-field" value="${childBirthDate}" />

          <button type="submit" id="btn-update-maternal" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            Update & Recalculate GHS Care Plan &rarr;
          </button>
        </form>
        <div id="maternal-save-status" style="margin-top: 0.5rem;"></div>
      </div>

      <!-- GHS Antenatal Care (ANC) Timeline -->
      <div class="card">
        <div class="card-title">
          <span>🤰</span> Ghana Health Service (GHS) ANC Care Timeline
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Tap any visit item to toggle completion status. Saved to your on-device database.
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
    const setupForm = container.querySelector('#maternal-setup-form');
    const statusBox = container.querySelector('#maternal-save-status');

    let completedSet = new Set();

    async function loadSchedules() {
      const weeks = parseInt(container.querySelector('#input-maternal-weeks')?.value) || state.profile.gestationalWeeks || 24;
      const dueDate = container.querySelector('#input-maternal-duedate')?.value || state.profile.dueDate || '2026-11-20';
      const childBirthDate = container.querySelector('#input-maternal-childdob')?.value || state.profile.childBirthDate || '2026-01-01';

      // Load saved schedules from backend
      const savedRes = await api.getUserSchedules(state.userId);
      if (savedRes.success && savedRes.data) {
        completedSet = new Set();
        savedRes.data.forEach(item => {
          if (item.is_completed) completedSet.add(item.id);
        });
      }

      // 1. Fetch ANC Schedule
      const ancRes = await api.getANCSchedule({ gestationalWeeks: weeks, dueDate });
      if (ancRes.success && ancRes.data) {
        ancContainer.innerHTML = ancRes.data.map(visit => {
          const itemId = `sched-${state.userId}-anc_visit-${visit.dueDate}`;
          const isCompleted = completedSet.has(itemId) || visit.isCompleted;

          return `
            <div class="checklist-item anc-item-toggle" data-id="${itemId}" data-type="anc_visit" data-title-eng="${visit.titleEnglish}" data-title-twi="${visit.titleTwi}" data-date="${visit.dueDate}" style="border-left: 4px solid ${isCompleted ? 'var(--primary)' : 'var(--accent-blue)'}; cursor: pointer;">
              <input type="checkbox" ${isCompleted ? 'checked' : ''} style="pointer-events: none;" />
              <div style="flex: 1;">
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
                  Target Date: <strong>${visit.dueDate}</strong> | Status: ${isCompleted ? '✅ Completed' : '📅 Upcoming'}
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Bind toggle clicks
        ancContainer.querySelectorAll('.anc-item-toggle').forEach(el => {
          el.addEventListener('click', async () => {
            const itemId = el.getAttribute('data-id');
            const type = el.getAttribute('data-type');
            const titleEng = el.getAttribute('data-title-eng');
            const titleTwi = el.getAttribute('data-title-twi');
            const dueDate = el.getAttribute('data-date');
            const isNowDone = !completedSet.has(itemId);

            if (isNowDone) completedSet.add(itemId);
            else completedSet.delete(itemId);

            await api.saveUserSchedule([
              { id: itemId, type, titleEng, titleTwi, dueDate, isCompleted: isNowDone }
            ], state.userId);

            loadSchedules();
          });
        });
      }

      // 2. Fetch Immunization Schedule
      const immRes = await api.getImmunizationSchedule({ childBirthDate });
      if (immRes.success && immRes.data) {
        immContainer.innerHTML = immRes.data.map(imm => {
          const itemId = `sched-${state.userId}-child_immunization-${imm.vaccineCode || imm.dueDate}`;
          const isCompleted = completedSet.has(itemId) || imm.isCompleted;

          return `
            <div class="checklist-item imm-item-toggle" data-id="${itemId}" data-type="child_immunization" data-title-eng="${imm.titleEnglish}" data-title-twi="${imm.titleTwi}" data-date="${imm.dueDate}" data-code="${imm.vaccineCode}" style="border-left: 4px solid ${isCompleted ? 'var(--primary)' : 'var(--accent-purple)'}; cursor: pointer;">
              <input type="checkbox" ${isCompleted ? 'checked' : ''} style="pointer-events: none;" />
              <div style="flex: 1;">
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
                  Scheduled Date: <strong>${imm.dueDate}</strong> | Status: ${isCompleted ? '✅ Given' : '📅 Due'}
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Bind toggle clicks
        immContainer.querySelectorAll('.imm-item-toggle').forEach(el => {
          el.addEventListener('click', async () => {
            const itemId = el.getAttribute('data-id');
            const type = el.getAttribute('data-type');
            const titleEng = el.getAttribute('data-title-eng');
            const titleTwi = el.getAttribute('data-title-twi');
            const dueDate = el.getAttribute('data-date');
            const vaccineCode = el.getAttribute('data-code');
            const isNowDone = !completedSet.has(itemId);

            if (isNowDone) completedSet.add(itemId);
            else completedSet.delete(itemId);

            await api.saveUserSchedule([
              { id: itemId, type, titleEng, titleTwi, dueDate, vaccineCode, isCompleted: isNowDone }
            ], state.userId);

            loadSchedules();
          });
        });
      }
    }

    // Initial load
    loadSchedules();

    // Form submit
    setupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const weeks = parseInt(container.querySelector('#input-maternal-weeks').value) || 24;
      const dueDate = container.querySelector('#input-maternal-duedate').value || '2026-11-20';
      const childBirthDate = container.querySelector('#input-maternal-childdob').value || '2026-01-01';

      state.profile.gestationalWeeks = weeks;
      state.profile.dueDate = dueDate;
      state.profile.childBirthDate = childBirthDate;

      await api.saveProfile({
        userId: state.userId,
        gestationalWeeks: weeks,
        dueDate,
        childBirthDate
      });

      statusBox.innerHTML = `<div class="status-banner safe">✓ Care parameters saved & schedule recalculated!</div>`;
      setTimeout(() => { statusBox.innerHTML = ''; }, 3000);

      loadSchedules();
    });
  }
};

