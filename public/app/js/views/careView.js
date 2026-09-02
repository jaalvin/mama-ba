/**
 * Screen 8: Care & Logistics (Pharmacies, Prescriptions, Appointments) View
 */
export const CareView = {
  render(state) {
    const isTwi = state.language === 'twi';

    return `
      <div class="card">
        <div class="card-title">
          <span>🏥</span> ${isTwi ? 'Ayaresabea & Adwumakuw' : 'Care & Logistics Portal'}
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Find accredited GHS pharmacies, order essential medications, and book hospital ANC appointments.
        </p>

        <!-- Pharmacy Search -->
        <div style="margin-bottom: 1.5rem;">
          <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">
            Search Accredited Pharmacies (by City/Region):
          </label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="care-pharmacy-search" class="input-field" placeholder="e.g. Kumasi, Accra, Sunyani..." value="Kumasi" style="font-size: 0.85rem;" />
            <button id="btn-search-pharmacies" class="btn btn-primary" style="font-size: 0.85rem;">
              Search
            </button>
          </div>

          <div id="care-pharmacy-results" style="margin-top: 1rem;">
            <div style="color: var(--text-muted); font-size: 0.85rem;">Searching pharmacies...</div>
          </div>
        </div>

        <!-- Prescription Order Form -->
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-card);">
          <div class="card-title" style="font-size: 1rem;">
            <span>💊</span> Order Prescription / Essential Meds
          </div>
          <form id="care-order-form" style="margin-top: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Medication Name:</label>
            <input type="text" id="order-med-name" class="input-field" placeholder="e.g. Ferrous Sulfate & Folic Acid" required style="font-size: 0.85rem;" />

            <div class="grid-2" style="margin-top: 0.5rem;">
              <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Quantity / Pack:</label>
                <input type="text" id="order-quantity" class="input-field" placeholder="1 Pack (30 tabs)" value="1 Pack (30 tabs)" style="font-size: 0.85rem;" />
              </div>
              <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Fulfillment Method:</label>
                <select id="order-fulfillment" class="select-field" style="font-size: 0.85rem;">
                  <option value="pickup">Pharmacy Pick-up</option>
                  <option value="delivery">Home Delivery</option>
                </select>
              </div>
            </div>

            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-top: 0.5rem; margin-bottom: 0.3rem;">Delivery Address / Clinic Location:</label>
            <input type="text" id="order-address" class="input-field" placeholder="e.g. Tech Junction, KNUST Campus, Kumasi" value="Tech Junction, KNUST, Kumasi" style="font-size: 0.85rem;" />

            <button type="submit" class="btn btn-secondary" style="width: 100%; margin-top: 0.75rem; font-size: 0.85rem;">
              Submit Medication Order &rarr;
            </button>
          </form>
          <div id="care-order-status" style="margin-top: 0.5rem;"></div>
        </div>

        <!-- Appointment Booking Form -->
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-card);">
          <div class="card-title" style="font-size: 1rem;">
            <span>📅</span> Book Clinic / Hospital Appointment
          </div>
          <form id="care-appointment-form" style="margin-top: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Hospital / Clinic Name:</label>
            <input type="text" id="appt-hospital" class="input-field" placeholder="e.g. KNUST Hospital / Komfo Anokye Teaching Hospital" value="KNUST Hospital, Kumasi" required style="font-size: 0.85rem;" />

            <div class="grid-2" style="margin-top: 0.5rem;">
              <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Appointment Date:</label>
                <input type="date" id="appt-date" class="input-field" value="2026-09-15" required style="font-size: 0.85rem;" />
              </div>
              <div>
                <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 0.3rem;">Preferred Time:</label>
                <input type="time" id="appt-time" class="input-field" value="09:00" required style="font-size: 0.85rem;" />
              </div>
            </div>

            <label style="font-weight: 600; font-size: 0.85rem; display: block; margin-top: 0.5rem; margin-bottom: 0.3rem;">Reason for Visit:</label>
            <select id="appt-reason" class="select-field" style="font-size: 0.85rem;">
              <option value="ANC Checkup">Routine ANC Booking / Checkup</option>
              <option value="Ultrasound Scan">Ultrasound / Lab Scan</option>
              <option value="Vaccination">Childhood Vaccination</option>
              <option value="General Consultation">General Midwife Consultation</option>
            </select>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem; font-size: 0.85rem;">
              Book Appointment & Save to Calendar &rarr;
            </button>
          </form>
          <div id="care-appt-status" style="margin-top: 0.5rem;"></div>
        </div>
      </div>
    `;
  },

  async bindEvents(container, state, onNavigate, api) {
    const searchBtn = container.querySelector('#btn-search-pharmacies');
    const searchInput = container.querySelector('#care-pharmacy-search');
    const resultsBox = container.querySelector('#care-pharmacy-results');
    const orderForm = container.querySelector('#care-order-form');
    const orderStatus = container.querySelector('#care-order-status');
    const apptForm = container.querySelector('#care-appointment-form');
    const apptStatus = container.querySelector('#care-appt-status');

    async function doSearch() {
      const query = searchInput.value.trim();
      const res = await api.searchPharmacies({ query });
      if (res.success && res.data) {
        if (res.data.length === 0) {
          resultsBox.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No pharmacies found matching "${query}".</div>`;
          return;
        }

        resultsBox.innerHTML = res.data.map(p => `
          <div class="checklist-item" style="border-left: 4px solid var(--primary); margin-bottom: 0.5rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">🏢 ${p.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                📍 ${p.address}, ${p.city} | 📞 ${p.phone}
              </div>
              <div style="font-size: 0.75rem; color: var(--primary); margin-top: 0.2rem;">
                ⭐ Rating: ${p.rating} / 5.0 | ${p.is_open_24h ? '🟢 Open 24 Hours' : '🕒 Standard Hours'}
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    searchBtn?.addEventListener('click', doSearch);
    doSearch();

    orderForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const medicationName = container.querySelector('#order-med-name').value;
      const quantity = container.querySelector('#order-quantity').value;
      const fulfillmentMethod = container.querySelector('#order-fulfillment').value;
      const deliveryAddress = container.querySelector('#order-address').value;

      const res = await api.createOrder({
        userId: state.userId,
        medicationName,
        quantity,
        fulfillmentMethod,
        deliveryAddress
      });

      if (res.success) {
        orderStatus.innerHTML = `<div class="status-banner safe">✓ Prescription order #${res.data.id || 'CONFIRMED'} placed successfully!</div>`;
        container.querySelector('#order-med-name').value = '';
        setTimeout(() => { orderStatus.innerHTML = ''; }, 4000);
      }
    });

    apptForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hospitalName = container.querySelector('#appt-hospital').value;
      const appointmentDate = container.querySelector('#appt-date').value;
      const appointmentTime = container.querySelector('#appt-time').value;
      const reason = container.querySelector('#appt-reason').value;

      const res = await api.createAppointment({
        userId: state.userId,
        hospitalName,
        appointmentDate,
        appointmentTime,
        reason
      });

      if (res.success) {
        apptStatus.innerHTML = `<div class="status-banner safe">✓ Appointment booked with ${hospitalName} on ${appointmentDate} at ${appointmentTime}!</div>`;
        setTimeout(() => { apptStatus.innerHTML = ''; }, 4000);
      }
    });
  }
};
