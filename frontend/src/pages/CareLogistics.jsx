import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import {
  MapPin,
  Building2,
  Search,
  Phone,
  Navigation,
  Truck,
  Calendar,
  Video,
  UserCheck,
  Upload,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Pill,
} from "lucide-react";

// Real pharmacies in Kumasi with maps search fallback & phone links
const LOCAL_PHARMACIES = [
  {
    id: 1,
    name: "Mikaddo Pharmacy",
    district: "Commercial Link, Kumasi",
    open: true,
    stock: true,
    phone: "+233322021557",
    query: "Mikaddo Pharmacy Commercial Link Kumasi",
  },
  {
    id: 2,
    name: "KAK Pharmacy Ltd",
    district: "KNUST Rd, Kumasi",
    open: true,
    stock: true,
    phone: "+233208179910",
    query: "KAK Pharmacy Ltd KNUST Rd Kumasi",
  },
  {
    id: 3,
    name: "Juliponia Pharmacy Ltd",
    district: "Junction, Kumasi",
    open: true,
    stock: true,
    phone: "+233546795970",
    query: "Juliponia Pharmacy Ltd Kumasi",
  },
  {
    id: 4,
    name: "Rany Pharmacy",
    district: "KNUST Area, Kumasi",
    open: true,
    stock: true,
    phone: "+233554069146",
    query: "Rany Pharmacy KNUST Kumasi",
  },
  {
    id: 5,
    name: "LAUD K Pharmacy",
    district: "Kotei Rd, Kumasi",
    open: true,
    stock: false,
    phone: "+233208440770",
    query: "LAUD K Pharmacy Kotei Kumasi",
  },
];

const HOSPITALS = [
  { id: "knust", label: { en: "KNUST Hospital", twi: "KNUST Ayaresabea" }, location: "KNUST Campus, Kumasi" },
  { id: "bomso", label: { en: "Bomso Clinic", twi: "Bomso Ayaresabea" }, location: "Bomso Crescent, Kumasi" },
  { id: "maxcity", label: { en: "Max City Medical Centre", twi: "Max City Ayaresabea" }, location: "James Omusu Ave, Kumasi" },
  { id: "kath", label: { en: "Komfo Anokye Teaching Hospital", twi: "KATH Sukuu Ayaresabea" }, location: "Okomfo Anokye Rd, Kumasi" },
];

export default function CareLogistics() {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState("pharmacy");
  const [search, setSearch] = useState("");
  
  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(LOCAL_PHARMACIES[0].id);
  const [prescriptionText, setPrescriptionText] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fileAttached, setFileAttached] = useState(false);
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);

  // Appointment Form State
  const [primaryHospital, setPrimaryHospital] = useState(HOSPITALS[0].id);
  const [backupHospital, setBackupHospital] = useState(HOSPITALS[1].id);
  const [visitType, setVisitType] = useState("inperson"); // "inperson" | "virtual"
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const filteredPharmacies = LOCAL_PHARMACIES.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    setDeliverySubmitted(true);
    setTimeout(() => {
      setDeliverySubmitted(false);
      setShowDeliveryModal(false);
      setPrescriptionText("");
      setDeliveryAddress("");
      setContactPhone("");
      setFileAttached(false);
    }, 2000);
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      {/* Header */}
      <h1 className="font-headline text-headline-md text-on-surface mb-1">
        {lang === "twi" ? "Mmoa Nhwɛ" : "Care & Services"}
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm">
        {lang === "twi"
          ? "Hwɛ nnuro dwa ne yɛ nhyiam"
          : "Find nearby pharmacies, order prescription delivery, and book appointments"}
      </p>

      {/* Tab Switcher */}
      <div className="flex bg-surface-container rounded-2xl p-1 mb-6 border border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveTab("pharmacy")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "pharmacy"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{lang === "twi" ? "Nnuro Dwa" : "Pharmacies"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appointment")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "appointment"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{lang === "twi" ? "Hyia Nhyiam" : "Appointments"}</span>
        </button>
      </div>

      {/* === PHARMACY TAB === */}
      {activeTab === "pharmacy" && (
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder={lang === "twi" ? "Hwɛ wo kuropɔn mu..." : "Search pharmacy or district in Kumasi..."}
              className="w-full h-13 pl-12 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
            />
          </div>

          {/* Pharmacy List */}
          <div className="flex flex-col gap-3">
            {filteredPharmacies.map((p) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;
              return (
                <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-on-surface text-sm">{p.name}</h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-outline" />
                        {p.district}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direct Phone Call */}
                      <a
                        href={`tel:${p.phone}`}
                        className="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center hover:bg-primary-container/40 transition-colors"
                        title="Call Pharmacy"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {/* Google Maps Link */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center hover:bg-primary-container/40 transition-colors"
                        title="Open in Google Maps"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                        p.open
                          ? "bg-forest-green/10 text-forest-green border-forest-green/30"
                          : "bg-surface-container-highest text-on-surface-variant border-outline-variant"
                      }`}>
                        <Clock className="w-3 h-3" />
                        {p.open ? (lang === "twi" ? "Abue" : "Open Now") : (lang === "twi" ? "Ato" : "Closed")}
                      </span>

                      {p.stock && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-primary-container/20 text-primary border border-primary/20 flex items-center gap-1">
                          <Pill className="w-3 h-3" />
                          {lang === "twi" ? "Nnuro Wɔ Ho" : "Stock Verified"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPharmacyId(p.id);
                        setShowDeliveryModal(true);
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{lang === "twi" ? "Soma" : "Order"}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPharmacies.length === 0 && (
              <p className="text-on-surface-variant text-center text-sm mt-4">
                {lang === "twi" ? "Nnuro dwa biara nni hɔ" : "No pharmacies found for that search."}
              </p>
            )}
          </div>

          {/* Delivery Trigger Button */}
          <button
            type="button"
            onClick={() => setShowDeliveryModal(true)}
            className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Truck className="w-5 h-5" />
            <span>{lang === "twi" ? "Bɔ Krataa Delivery" : "Request Prescription Delivery"}</span>
          </button>
        </div>
      )}

      {/* === APPOINTMENT TAB === */}
      {activeTab === "appointment" && (
        <div className="flex flex-col gap-4">
          {confirmed ? (
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-forest-green" />
              <h2 className="font-headline text-headline-md text-forest-green">
                {lang === "twi" ? "Nhyiam Asi Ho!" : "Appointment Confirmed!"}
              </h2>
              <div className="text-sm text-on-surface flex flex-col gap-1">
                <p className="font-semibold">
                  Primary: {HOSPITALS.find((h) => h.id === primaryHospital)?.label[lang === "twi" ? "twi" : "en"]}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Backup: {HOSPITALS.find((h) => h.id === backupHospital)?.label[lang === "twi" ? "twi" : "en"]}
                </p>
                <p className="text-xs text-on-surface-variant capitalize">
                  Mode: {visitType === "inperson" ? "In-Person Visit" : "Virtual Consultation"}
                </p>
                <p className="text-xs font-semibold text-primary mt-1">
                  {apptDate} at {apptTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className="text-primary text-xs font-semibold underline mt-2"
              >
                {lang === "twi" ? "Yɛ foforo bio" : "Book another appointment"}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setConfirmed(true); }} className="flex flex-col gap-4">
              {/* Primary Hospital */}
              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                  {lang === "twi" ? "Ayaresabea Titiriw (Primary)" : "Primary Hospital / Regular Clinic"}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
                  <select
                    value={primaryHospital}
                    onChange={(e) => setPrimaryHospital(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {HOSPITALS.map((h) => (
                      <option key={`pri-${h.id}`} value={h.id}>
                        {h.label[lang === "twi" ? "twi" : "en"]} ({h.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Backup Hospital */}
              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                  {lang === "twi" ? "Ayaresabea a Ɛtɔ so Mmienu (Backup)" : "Backup Healthcare Facility"}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
                  <select
                    value={backupHospital}
                    onChange={(e) => setBackupHospital(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {HOSPITALS.map((h) => (
                      <option key={`bak-${h.id}`} value={h.id}>
                        {h.label[lang === "twi" ? "twi" : "en"]} ({h.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Visit Type Toggle */}
              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                  {lang === "twi" ? "Nhyiam Sɛn?" : "Consultation Mode"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitType("inperson")}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      visitType === "inperson"
                        ? "bg-primary-container/40 border-primary text-primary"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{lang === "twi" ? "Kɔ Ananmu" : "In-Person"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisitType("virtual")}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      visitType === "virtual"
                        ? "bg-primary-container/40 border-primary text-primary"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Virtual</span>
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                    {lang === "twi" ? "Da" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                    {lang === "twi" ? "Bere" : "Time"}
                  </label>
                  <input
                    type="time"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-xs"
                    required
                  />
                </div>
              </div>

              {/* Clinical Notes / Reason */}
              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold text-xs">
                  {lang === "twi" ? "Ayaresabea Asɛm" : "Reason for Appointment"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Antenatal ANC checkup, lab test review..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === "twi" ? "Hyɛ Nhyiam" : "Confirm Appointment Request"}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Prescription Delivery Modal */}
      {showDeliveryModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowDeliveryModal(false)}
        >
          <div
            className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6 pb-8 border border-outline-variant max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h2 className="font-headline text-headline-sm text-on-surface">
                  {lang === "twi" ? "Bɔ Krataa Delivery" : "Prescription Delivery"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="p-1 rounded-full text-outline hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deliverySubmitted ? (
              <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-4 flex items-center gap-3 text-forest-green">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-medium">
                  {lang === "twi"
                    ? "W'aduro kɔ krado! Yɛbɛsoma ba wo nkyɛn."
                    : "Delivery request submitted! The pharmacy will reach out shortly."}
                </span>
              </div>
            ) : (
              <form onSubmit={handleDeliverySubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {lang === "twi" ? "Yi Nnurobea" : "Target Pharmacy"}
                  </label>
                  <select
                    value={selectedPharmacyId}
                    onChange={(e) => setSelectedPharmacyId(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {LOCAL_PHARMACIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.district})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {lang === "twi" ? "Nnuro Din" : "Medication & Dosage Details"}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={lang === "twi" ? "Nnuro din..." : "Prescription details (e.g. Folic acid 5mg, Ferrous sulfate)..."}
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {lang === "twi" ? "Fa Krataa no Hwɛ" : "Upload Doctor's Prescription (Optional)"}
                  </label>
                  <label className="border border-dashed border-outline-variant hover:border-primary bg-surface-container-low rounded-xl p-3 flex flex-col items-center gap-1 cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-primary" />
                    <span className="text-xs text-on-surface">
                      {fileAttached ? "Prescription attached ✓" : "Tap to upload image/PDF"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={() => setFileAttached(true)}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {lang === "twi" ? "Wo ɛfie baabi..." : "Delivery Address & Landmark"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kotei Junction, near KNUST campus"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {lang === "twi" ? "Wo fon nɔma..." : "Contact Phone Number"}
                  </label>
                  <input
                    type="tel"
                    placeholder="+233 XX XXX XXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-xl active:scale-95 transition-transform mt-1"
                >
                  {lang === "twi" ? "Soma" : "Submit Delivery Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}