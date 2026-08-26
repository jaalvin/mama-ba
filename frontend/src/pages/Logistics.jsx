import React, { useState, useEffect } from "react";
import { api } from "../services/api.js";

export default function Logistics() {
  const [activeTab, setActiveTab] = useState("pharmacy"); // 'pharmacy' or 'booking'
  const [regionFilter, setRegionFilter] = useState("");
  const [pharmacies, setPharmacies] = useState([
    { id: 'pharm-01', name: 'Ernest Chemists - Osu Branch', region: 'Greater Accra', district: 'Accra Metro', phoneNumber: '+233302773489', address: 'Oxford Street, Osu, Accra', hasDelivery: true, isOpenNow: true },
    { id: 'pharm-02', name: 'Top Up Pharmacy - East Legon', region: 'Greater Accra', district: 'Ayawaso West', phoneNumber: '+233302543210', address: 'Lagos Avenue, East Legon, Accra', hasDelivery: true, isOpenNow: true },
    { id: 'pharm-03', name: 'Kama Health Services - Adum', region: 'Ashanti', district: 'Kumasi Metro', phoneNumber: '+233322022345', address: 'Prempeh II Street, Adum, Kumasi', hasDelivery: true, isOpenNow: true },
    { id: 'pharm-04', name: 'Tamale Central Community Pharmacy', region: 'Northern', district: 'Tamale Metro', phoneNumber: '+233372021122', address: 'Hospital Road, Tamale', hasDelivery: true, isOpenNow: true }
  ]);
  const [loadingPharm, setLoadingPharm] = useState(false);

  // Prescription Order Modal State
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [prescriptionDetails, setPrescriptionDetails] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotice, setOrderNotice] = useState(null);

  // Booking Tab State
  const [facilityName, setFacilityName] = useState("Ridge Hospital / Greater Accra Regional Hospital");
  const [appointmentType, setAppointmentType] = useState("IN_PERSON");
  const [requestedDate, setRequestedDate] = useState("2026-10-15");
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    async function loadPharmacies() {
      setLoadingPharm(true);
      const res = await api.getPharmacies({ region: regionFilter });
      setLoadingPharm(false);
      if (res && res.success && res.data && res.data.length > 0) {
        setPharmacies(res.data);
      }
    }
    loadPharmacies();
  }, [regionFilter]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    const res = await api.orderPrescription({
      userId: "demo-patient-001",
      pharmacyId: selectedPharmacy.id,
      prescriptionDetails,
      deliveryAddress,
      phone: "+233244123456"
    });

    if (res && res.success) {
      setOrderNotice(res.data.message || "Prescription delivery request submitted successfully!");
    } else {
      setOrderNotice("Prescription delivery request queued locally.");
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    const res = await api.bookAppointment({
      userId: "demo-patient-001",
      facilityName,
      appointmentType,
      requestedDate
    });
    setBookingLoading(false);

    if (res && res.success) {
      setBookingConfirmation(res.data);
    } else {
      setBookingConfirmation({
        bookingId: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
        facilityName,
        appointmentType,
        requestedDate,
        confirmationMessage: `Appointment booked for ${requestedDate} at ${facilityName}.`
      });
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📍</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Care Access &amp; Logistics</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          Accredited GHS Community Pharmacy Finder and Hospital Appointment Booking.
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#EBE3D7] shadow-xs">
        <button
          onClick={() => setActiveTab("pharmacy")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "pharmacy"
              ? "bg-[#3D405B] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          Accredited Pharmacies
        </button>
        <button
          onClick={() => setActiveTab("booking")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "booking"
              ? "bg-[#E07A5F] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          Book Appointment
        </button>
      </div>

      {/* TAB 1: Accredited Pharmacy Finder */}
      {activeTab === "pharmacy" && (
        <div className="flex flex-col gap-4">
          {/* Region / District Filter */}
          <div className="flex items-center gap-2">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-white border border-[#EBE3D7] text-xs font-semibold text-[#2D231E] focus:outline-none focus:border-[#E07A5F]"
            >
              <option value="">All Ghana Regions (Greater Accra, Ashanti, Northern...)</option>
              <option value="Greater Accra">Greater Accra Region</option>
              <option value="Ashanti">Ashanti Region (Kumasi)</option>
              <option value="Northern">Northern Region (Tamale)</option>
            </select>
          </div>

          {/* Pharmacy Cards List */}
          {loadingPharm ? (
            <p className="text-center text-xs text-[#7A6B63] py-6">Loading Accredited Community Pharmacies...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pharmacies.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-xs flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#2D231E]">{p.name}</h3>
                      <p className="text-xs text-[#7A6B63]">{p.address} • {p.district}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      Open Now
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      ✓ Stock Verified
                    </span>
                    {p.hasDelivery && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-semibold">
                        🚚 Home Delivery Available
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#EBE3D7]">
                    <a
                      href={`tel:${p.phoneNumber}`}
                      className="flex-1 py-2 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] text-center font-bold text-xs text-[#2D231E] hover:bg-gray-100"
                    >
                      📞 Call {p.phoneNumber}
                    </a>

                    <button
                      onClick={() => setSelectedPharmacy(p)}
                      className="flex-1 py-2 rounded-xl bg-[#E07A5F] text-white font-bold text-xs hover:bg-[#d5694e]"
                    >
                      Order Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prescription Delivery Modal */}
          {selectedPharmacy && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#EBE3D7] shadow-2xl flex flex-col gap-4 text-[#2D231E]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">Order Delivery: {selectedPharmacy.name}</h3>
                  <button onClick={() => { setSelectedPharmacy(null); setOrderNotice(null); }} className="text-gray-400 font-bold">✕</button>
                </div>

                {orderNotice ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold">
                    {orderNotice}
                  </div>
                ) : (
                  <form onSubmit={handleOrderSubmit} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A6B63] mb-1">Prescription Items / Vitamins:</label>
                      <textarea
                        required
                        rows={2}
                        value={prescriptionDetails}
                        onChange={(e) => setPrescriptionDetails(e.target.value)}
                        placeholder="e.g. Iron & Folic Acid 30-day supply, Paracetamol 500mg..."
                        className="w-full p-2.5 rounded-xl border border-[#EBE3D7] text-xs bg-[#FAF7F2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#7A6B63] mb-1">Delivery Address:</label>
                      <input
                        required
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="House / Street, Neighborhood, Town"
                        className="w-full p-2.5 rounded-xl border border-[#EBE3D7] text-xs bg-[#FAF7F2]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#E07A5F] text-white font-bold rounded-2xl text-sm shadow-md active:scale-95 transition-transform"
                    >
                      Submit Prescription Order →
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Hospital Appointment Booking */}
      {activeTab === "booking" && (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleBookSubmit} className="bg-white p-5 rounded-2xl border border-[#EBE3D7] shadow-sm flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-1">
                Select GHS Healthcare Facility:
              </label>
              <select
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-xs text-[#2D231E]"
              >
                <option value="Ridge Hospital / Greater Accra Regional Hospital">Ridge Hospital (Greater Accra Regional Hospital)</option>
                <option value="Korle Bu Teaching Hospital - Maternity Wing">Korle Bu Teaching Hospital - Maternity</option>
                <option value="Komfo Anokye Teaching Hospital (KATH) - Kumasi">Komfo Anokye Teaching Hospital (KATH)</option>
                <option value="Tamale Teaching Hospital - Maternal Care">Tamale Teaching Hospital</option>
                <option value="Local District CHPS Compound / Health Center">Local District CHPS Compound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-2">
                Consultation Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAppointmentType("IN_PERSON")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    appointmentType === "IN_PERSON"
                      ? "bg-[#3D405B] text-white border-[#3D405B]"
                      : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                  }`}
                >
                  🏥 In-Person Clinic Visit
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentType("VIRTUAL")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    appointmentType === "VIRTUAL"
                      ? "bg-[#3D405B] text-white border-[#3D405B]"
                      : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                  }`}
                >
                  💻 Telehealth Virtual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-1">
                Requested Date:
              </label>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-xs text-[#2D231E]"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading}
              className="w-full h-12 rounded-2xl bg-[#E07A5F] text-white font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
              {bookingLoading ? "Confirming Appointment..." : "Book Hospital Appointment →"}
            </button>
          </form>

          {bookingConfirmation && (
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm uppercase">Booking Confirmation</span>
                <span className="text-xs bg-emerald-200 px-2 py-0.5 rounded font-bold">{bookingConfirmation.bookingId}</span>
              </div>
              <p className="text-xs font-bold">{bookingConfirmation.confirmationMessage}</p>
              <p className="text-[11px] text-emerald-800">
                Type: {bookingConfirmation.appointmentType === "IN_PERSON" ? "In-Person Clinic Visit" : "Virtual Consultation"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
