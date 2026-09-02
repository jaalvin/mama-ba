/**
 * Screen 5: Apomuden Local Herbal & Food Safety Checker View
 */
export const HerbalView = {
  render(state) {
    return `
      <div class="card">
        <div class="card-title">
          <span>🌿</span> Apomuden Local Herbal & Food Safety Checker
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Select or type any local Ghanaian herbal tea or diet to check real-time contraindications with prescribed medicines.
        </p>

        <!-- Selector 1: Local Herb -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">
          1. Select or Type Ghanaian Herbal Tea / Remedy:
        </label>
        <select id="select-herb" class="select-field">
          <option value="">-- Choose Herbal Tea --</option>
          <option value="Nibima" selected>Nibima (Cryptolepis sanguinolenta / Yellow Dye Root)</option>
          <option value="Taabea">Taabea Herbal Bitters</option>
          <option value="Moringa">Moringa Leaf Infusion (Zaangala)</option>
          <option value="Neem">Neem Leaf Tea (Kingiodendron)</option>
          <option value="Ginger">Ginger & Lemon Tea</option>
          <option value="Koko">Hausa Koko (Fermented Corn Porridge)</option>
        </select>
        <input type="text" id="custom-herb-input" class="input-field" placeholder="Or type custom herb/remedy name..." style="margin-top: -0.25rem; font-size: 0.85rem;" />

        <!-- Selector 2: Prescribed Medicine -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-top: 0.8rem; margin-bottom: 0.4rem;">
          2. Select or Type Prescribed Western Medicine:
        </label>
        <select id="select-drug" class="select-field">
          <option value="">-- Choose Prescribed Drug --</option>
          <option value="Iron Supplements" selected>Prenatal Iron Supplements (Ferrous Sulfate)</option>
          <option value="Paracetamol">Paracetamol / Painkiller</option>
          <option value="Antihypertensive">Blood Pressure Medicine (Amlodipine/Methyldopa)</option>
          <option value="Prenatal Vitamins">Prenatal Multivitamins</option>
          <option value="Antibiotics">Ciprofloxacin / Antibiotics</option>
        </select>
        <input type="text" id="custom-drug-input" class="input-field" placeholder="Or type custom medication name..." style="margin-top: -0.25rem; font-size: 0.85rem;" />

        <!-- Selector 3: Food Item -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-top: 0.8rem; margin-bottom: 0.4rem;">
          3. Optional Food Item / Milk Intake:
        </label>
        <select id="select-food" class="select-field">
          <option value="">-- None / Standard Diet --</option>
          <option value="Milk">Condensed Milk / Heavy Dairy Powder</option>
          <option value="Citrus">Orange / Lemon Juice</option>
        </select>

        <button id="btn-check-herbal" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
          Evaluate Herbal Safety Matrix &rarr;
        </button>

        <!-- Result Status Container -->
        <div id="herbal-result-box" style="margin-top: 1.5rem;">
          <!-- Default loaded check output -->
        </div>

        <!-- History List -->
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-card);">
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Recent Safety Matrix Checks:</div>
          <div id="herbal-history-box"></div>
        </div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const checkBtn = container.querySelector('#btn-check-herbal');
    const resultBox = container.querySelector('#herbal-result-box');
    const historyBox = container.querySelector('#herbal-history-box');

    const history = [];

    const renderHistory = () => {
      if (history.length === 0) {
        historyBox.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-dim);">No recent checks performed.</div>`;
        return;
      }
      historyBox.innerHTML = history.map(h => `
        <div style="background: rgba(15, 23, 42, 0.5); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-card); margin-bottom: 0.35rem; font-size: 0.8rem; flex: 1; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${h.herb} + ${h.drug}</strong>
            <div style="color: var(--text-muted); font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;">${h.details}</div>
          </div>
          <span class="badge ${h.severity === 'DANGER' ? 'badge-danger' : h.severity === 'CAUTION' ? 'badge-warning' : 'badge-success'}" style="font-size: 0.7rem;">${h.severity}</span>
        </div>
      `).join('');
    };

    const executeCheck = async () => {
      const customHerb = container.querySelector('#custom-herb-input').value.trim();
      const customDrug = container.querySelector('#custom-drug-input').value.trim();

      const herbName = customHerb || container.querySelector('#select-herb').value;
      const pharmaDrugName = customDrug || container.querySelector('#select-drug').value;
      const foodItem = container.querySelector('#select-food').value;

      if (!herbName || !pharmaDrugName) return;

      const res = await api.checkHerbalSafety({ herbName, pharmaDrugName, foodItem });

      if (res.success && res.data) {
        const data = res.data;
        const statusClass = data.severity === 'DANGER' ? 'danger' : data.severity === 'CAUTION' ? 'caution' : 'safe';
        const statusIcon = data.severity === 'DANGER' ? '🔴 DANGER' : data.severity === 'CAUTION' ? '🟡 CAUTION' : '🟢 SAFE';

        resultBox.innerHTML = `
          <div class="status-banner ${statusClass}">
            <div>
              <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">
                ${statusIcon}: ${data.severity} STATUS
              </div>
              <strong>Interaction Details:</strong> ${data.interactionDetails}<br><br>
              <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border-left: 3px solid currentColor;">
                <strong>Twi Advice (Kasa Advice):</strong><br>${data.culturalAdviceTwi}
              </div><br>
              <strong>English Advice:</strong> ${data.culturalAdviceEnglish}
            </div>
          </div>
        `;

        history.unshift({
          herb: herbName,
          drug: pharmaDrugName,
          severity: data.severity,
          details: data.interactionDetails
        });
        if (history.length > 5) history.pop();
        renderHistory();
      }
    };

    checkBtn?.addEventListener('click', executeCheck);

    // Run initial demo check on view load
    executeCheck();
  }
};

