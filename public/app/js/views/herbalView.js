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
          Select your local Ghanaian herbal tea or diet to check real-time contraindications with prescribed medicines.
        </p>

        <!-- Selector 1: Local Herb -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">
          1. Select Ghanaian Herbal Tea / Remedy:
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

        <!-- Selector 2: Prescribed Medicine -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">
          2. Select Prescribed Western Medicine:
        </label>
        <select id="select-drug" class="select-field">
          <option value="">-- Choose Prescribed Drug --</option>
          <option value="Iron Supplements" selected>Prenatal Iron Supplements (Ferrous Sulfate)</option>
          <option value="Paracetamol">Paracetamol / Painkiller</option>
          <option value="Antihypertensive">Blood Pressure Medicine (Amlodipine/Methyldopa)</option>
          <option value="Prenatal Vitamins">Prenatal Multivitamins</option>
          <option value="Antibiotics">Ciprofloxacin / Antibiotics</option>
        </select>

        <!-- Selector 3: Food Item -->
        <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 0.4rem;">
          3. Optional Food Item / Milk Intake:
        </label>
        <select id="select-food" class="select-field">
          <option value="">-- None / Standard Diet --</option>
          <option value="Milk">Condensed Milk / Heavy Dairy Powder</option>
          <option value="Citrus">Orange / Lemon Juice</option>
        </select>

        <button id="btn-check-herbal" class="btn btn-primary" style="width: 100%;">
          Check Herbal Safety Matrix &rarr;
        </button>

        <!-- Result Status Container -->
        <div id="herbal-result-box" style="margin-top: 1.5rem;">
          <!-- Default loaded check output -->
        </div>
      </div>
    `;
  },

  bindEvents(container, state, onNavigate, api) {
    const checkBtn = container.querySelector('#btn-check-herbal');
    const resultBox = container.querySelector('#herbal-result-box');

    const executeCheck = async () => {
      const herbName = container.querySelector('#select-herb').value;
      const pharmaDrugName = container.querySelector('#select-drug').value;
      const foodItem = container.querySelector('#select-food').value;

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
      }
    };

    checkBtn?.addEventListener('click', executeCheck);

    // Run initial demo check on view load
    executeCheck();
  }
};
