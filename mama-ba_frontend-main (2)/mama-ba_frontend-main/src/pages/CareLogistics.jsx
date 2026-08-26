import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";

const PHARMACIES = [
  { id: 1, name: "Ernest Chemists — Osu", district: "Accra", open: true, stock: true, phone: "+233302760882" },
  { id: 2, name: "Tobinco Pharmaceuticals — Kumasi", district: "Kumasi", open: true, stock: false, phone: "+233322023110" },
  { id: 3, name: "Kama Pharmacy — Tamale", district: "Tamale", open: false, stock: true, phone: "+233372021140" },
  { id: 4, name: "Kinapharma Ltd — Accra Central", district: "Accra", open: true, stock: true, phone: "+233302228066" },
  { id: 5, name: "Entrance Pharmacy — Takoradi", district: "Takoradi", open: false, stock: false, phone: "+233312022540" },
];

const FACILITIES = [
  { id: "chps", label: { en: "CHPS Compound", twi: "CHPS Fie" } },
  { id: "health_center", label: { en: "Local Health Center", twi: "Ɔmantam Ayaresabea" } },
  { id: "district", label: { en: "District Hospital", twi: "Mantam Ayaresabea" } },
  { id: "teaching", label: { en: "Teaching Hospital", twi: "Sukuu Ayaresabea" } },
];

export default function CareLogistics() {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState("pharmacy");
  const [search, setSearch] = useState("");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [facility, setFacility] = useState("health_center");
  const [visitType, setVisitType] = useState("inperson");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const filteredPharmacies = PHARMACIES.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Mmoa Nhwɛ" : "Care & Services"}
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm">
        {lang === "twi"
          ? "Hwɛ nnuro dwa ne yɛ nhyiam"
          : "Find pharmacies and book appointments"}
      </p>

      {/* Tab Switcher */}
      <div className="flex bg-surface-container rounded-2xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("pharmacy")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "pharmacy"
              ? "bg-surface-container-lowest text-on-surface shadow-sm"
              : "text-on-surface-variant"
          }`}
        >
          📍 {lang === "twi" ? "Nnuro Dwa" : "Pharmacy"}
        </button>
        <button
          onClick={() => setActiveTab("appointment")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "appointment"
              ? "bg-surface-container-lowest text-on-surface shadow-sm"
              : "text-on-surface-variant"
          }`}
        >
          🏥 {lang === "twi" ? "Hyia Nhyiam" : "Appointment"}
        </button>
      </div>

      {/* === PHARMACY TAB === */}
      {activeTab === "pharmacy" && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder={lang === "twi" ? "Hwɛ wo kuropɔn mu..." : "Search by name or district..."}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
            />
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {filteredPharmacies.map((p) => (
              <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-on-surface text-sm">{p.name}</h3>
                    <p className="text-xs text-on-surface-variant">{p.district}</p>
                  </div>
                  <a
                    href={`tel:${p.phone}`}
                    className="shrink-0 w-10 h-10 rounded-full bg-primary-container/30 text-primary flex items-center justify-center hover:bg-primary-container/60 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </a>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    p.open
                      ? "bg-forest-green/10 text-forest-green border-forest-green/30"
                      : "bg-surface-container-highest text-on-surface-variant border-outline-variant"
                  }`}>
                    {p.open ? (lang === "twi" ? "Abue" : "Open Now") : (lang === "twi" ? "Ato" : "Closed")}
                  </span>
                  {p.stock && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary-container/20 text-primary border border-primary/20">
                      {lang === "twi" ? "Nnuro Wɔ Ho" : "Stock Verified"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filteredPharmacies.length === 0 && (
              <p className="text-on-surface-variant text-center text-sm mt-4">
                {lang === "twi" ? "Nnuro dwa biara nni hɔ" : "No pharmacies found for that search."}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowDeliveryModal(true)}
            className="w-full border-2 border-primary text-primary font-headline text-button py-3 rounded-full hover:bg-primary-container/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">local_shipping</span>
            {lang === "twi" ? "Bɔ Krataa Delivery" : "Request Prescription Delivery"}
          </button>
        </div>
      )}

      {/* === APPOINTMENT TAB === */}
      {activeTab === "appointment" && (
        <div className="flex flex-col gap-4">
          {confirmed ? (
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-forest-green text-[48px]">check_circle</span>
              <h2 className="font-headline text-headline-md text-forest-green">
                {lang === "twi" ? "Nhyiam Asi Ho!" : "Appointment Confirmed!"}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {FACILITIES.find((f) => f.id === facility)?.label[lang === "twi" ? "twi" : "en"]}
                {" · "}
                {visitType === "inperson" ? (lang === "twi" ? "Kɔ Ananmu" : "In-Person") : (lang === "twi" ? "Virtual" : "Virtual")}
              </p>
              <p className="text-on-surface font-semibold">{apptDate} at {apptTime}</p>
              <button onClick={() => setConfirmed(false)} className="text-primary text-sm underline">
                {lang === "twi" ? "Yɛ foforo bio" : "Book another"}
              </button>
            </div>
          ) : (
            <>
              {/* Facility Selector */}
              <div>
                <label className="block text-label-md text-on-surface mb-2">
                  {lang === "twi" ? "Yi Ayaresabea" : "Select Facility"}
                </label>
                <div className="flex flex-col gap-2">
                  {FACILITIES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFacility(f.id)}
                      className={`text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-colors ${
                        facility === f.id
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container-lowest text-on-surface border-outline-variant"
                      }`}
                    >
                      {lang === "twi" ? f.label.twi : f.label.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-label-md text-on-surface mb-2">
                  {lang === "twi" ? "Nhyiam Sɛn?" : "Visit Type"}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisitType("inperson")}
                    className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      visitType === "inperson"
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    {lang === "twi" ? "Kɔ Ananmu" : "In-Person"}
                  </button>
                  <button
                    onClick={() => setVisitType("virtual")}
                    className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      visitType === "virtual"
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">videocam</span>
                    Virtual
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md text-on-surface mb-2">
                    {lang === "twi" ? "Da" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-2">
                    {lang === "twi" ? "Bere" : "Time"}
                  </label>
                  <input
                    type="time"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                  />
                </div>
              </div>

              <button
                onClick={() => { if (apptDate && apptTime) setConfirmed(true); }}
                disabled={!apptDate || !apptTime}
                className="w-full bg-primary text-on-primary font-headline text-button py-4 rounded-full active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">event_available</span>
                {lang === "twi" ? "Hyɛ Nhyiam" : "Confirm Appointment"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Prescription Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowDeliveryModal(false)}>
          <div
            className="w-full max-w-md mx-auto bg-background rounded-t-3xl p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-6" />
            <h2 className="font-headline text-headline-md text-on-surface mb-4">
              {lang === "twi" ? "Bɔ Krataa Delivery" : "Prescription Delivery Request"}
            </h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={lang === "twi" ? "Nnuro din..." : "Prescription details (drug name, dosage)..."}
                className="w-full h-12 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm"
              />
              <input
                type="text"
                placeholder={lang === "twi" ? "Wo ɛfie baabi..." : "Delivery address..."}
                className="w-full h-12 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm"
              />
              <input
                type="tel"
                placeholder={lang === "twi" ? "Wo fon nɔma..." : "Your phone number..."}
                className="w-full h-12 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm"
              />
              <button
                onClick={() => { alert(lang === "twi" ? "Krataa asoma!" : "Request submitted!"); setShowDeliveryModal(false); }}
                className="w-full bg-primary text-on-primary font-headline text-button py-4 rounded-full active:scale-95 transition-transform"
              >
                {lang === "twi" ? "Soma" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
