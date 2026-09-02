import { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { careAppointments as apptAPI, getRecents, addRecent } from "../services/api.js";
import { scheduleAlarm } from "../services/notifications.js";
import {
  MapPin, Building2, Search, Phone, Navigation, Truck, Calendar,
  Video, UserCheck, Upload, X, CheckCircle2, Clock, CalendarCheck,
  Pill, Plus, Trash2, Loader2, LocateFixed,
} from "lucide-react";

// ── Fallback local pharmacies (Kumasi) ───────────────────────────────────────
const LOCAL_PHARMACIES = [
  { id: 1, name: "Mikaddo Pharmacy",       district: "Commercial Link, Kumasi", open: true,  stock: true,  phone: "+233322021557", query: "Mikaddo Pharmacy Commercial Link Kumasi" },
  { id: 2, name: "KAK Pharmacy Ltd",        district: "KNUST Rd, Kumasi",        open: true,  stock: true,  phone: "+233208179910", query: "KAK Pharmacy Ltd KNUST Rd Kumasi" },
  { id: 3, name: "Juliponia Pharmacy Ltd",  district: "Junction, Kumasi",        open: true,  stock: true,  phone: "+233546795970", query: "Juliponia Pharmacy Ltd Kumasi" },
  { id: 4, name: "Rany Pharmacy",           district: "KNUST Area, Kumasi",      open: true,  stock: true,  phone: "+233554069146", query: "Rany Pharmacy KNUST Kumasi" },
  { id: 5, name: "LAUD K Pharmacy",         district: "Kotei Rd, Kumasi",        open: true,  stock: false, phone: "+233208440770", query: "LAUD K Pharmacy Kotei Kumasi" },
];

function scheduleApptReminders(appt, addNotification) {
  const apptMs = new Date(`${appt.date}T${appt.time}`).getTime();
  if (isNaN(apptMs)) return;
  const cancellers = [];
  const scheduleOne = (offsetMs, titleEn, bodyEn) => {
    const targetMs = apptMs - offsetMs;
    if (targetMs <= Date.now()) return;
    cancellers.push(scheduleAlarm(targetMs, titleEn, bodyEn));
    const id = setTimeout(() => {
      addNotification({ type: "warning", titleEn, titleTwi: titleEn, bodyEn, bodyTwi: bodyEn });
    }, targetMs - Date.now());
    cancellers.push(() => clearTimeout(id));
  };
  scheduleOne(24 * 3600 * 1000, "Appointment Tomorrow", `${appt.reason} at ${appt.primaryHospital} — ${appt.time}`);
  scheduleOne(     3600 * 1000, "Appointment in 1 Hour", `${appt.reason} at ${appt.primaryHospital}`);
  return () => cancellers.forEach(fn => fn?.());
}

// ── Hospital recents chips ────────────────────────────────────────────────────
function RecentChips({ recentsKey, onSelect }) {
  const [recents, setRecents] = useState(() => getRecents(recentsKey));
  useEffect(() => { setRecents(getRecents(recentsKey)); }, [recentsKey]);
  if (!recents.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {recents.map(r => (
        <button key={r} type="button" onClick={() => onSelect(r)}
          className="text-xs px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
          {r}
        </button>
      ))}
    </div>
  );
}

export default function CareLogistics() {
  const { lang }    = useLang();
  const { accessToken } = useAuth();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("pharmacy");

  // ── Geolocation state ─────────────────────────────────────────────────────
  const [coords, setCoords]       = useState(null);
  const [geoError, setGeoError]   = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [search, setSearch]       = useState("");

  const requestLocation = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported on this device."); return; }
    setGeoLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      err => { setGeoError(err.message || "Could not get location."); setGeoLoading(false); }
    );
  };

  // Request location automatically when pharmacy tab opens
  useEffect(() => {
    if (activeTab === "pharmacy" && !coords) requestLocation();
  }, [activeTab]);

  // ── Delivery Modal ────────────────────────────────────────────────────────
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(LOCAL_PHARMACIES[0].id);
  const [prescriptionText, setPrescriptionText]     = useState("");
  const [deliveryAddress, setDeliveryAddress]       = useState("");
  const [contactPhone, setContactPhone]             = useState("");
  const [fileAttached, setFileAttached]             = useState(false);
  const [deliverySubmitted, setDeliverySubmitted]   = useState(false);

  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    setDeliverySubmitted(true);
    setTimeout(() => {
      setDeliverySubmitted(false); setShowDeliveryModal(false);
      setPrescriptionText(""); setDeliveryAddress(""); setContactPhone(""); setFileAttached(false);
    }, 2000);
  };

  // ── Appointments state ────────────────────────────────────────────────────
  const [appts, setAppts]             = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [savingAppt, setSavingAppt]   = useState(false);

  const [primaryHospital, setPrimaryHospital] = useState("");
  const [backupHospital, setBackupHospital]   = useState("");
  const [visitType, setVisitType]             = useState("inperson");
  const [apptDate, setApptDate]               = useState("");
  const [apptTime, setApptTime]               = useState("");
  const [reason, setReason]                   = useState("");

  const alarmCancellers = useRef({});

  useEffect(() => {
    if (!accessToken) return;
    apptAPI.list(accessToken)
      .then(list => {
        setAppts(list);
        list.forEach(appt => {
          alarmCancellers.current[appt.id] = scheduleApptReminders(appt, addNotification);
        });
      })
      .catch(() => setAppts([]))
      .finally(() => setApptLoading(false));
    return () => Object.values(alarmCancellers.current).forEach(fn => fn?.());
  }, [accessToken, addNotification]);

  const handleApptSubmit = async (e) => {
    e.preventDefault();
    if (!primaryHospital.trim() || !apptDate || !apptTime || !reason.trim()) return;
    setSavingAppt(true);
    try {
      const payload = {
        primaryHospital: primaryHospital.trim(),
        backupHospital: backupHospital.trim(),
        visitType,
        date: apptDate,
        time: apptTime,
        reason: reason.trim(),
      };
      const item = await apptAPI.create(accessToken, payload);
      setAppts(prev => [...prev, item]);

      // Save hospital names to recents
      addRecent("primary-hospital", primaryHospital.trim());
      if (backupHospital.trim()) addRecent("backup-hospital", backupHospital.trim());

      // Schedule reminders
      alarmCancellers.current[item.id] = scheduleApptReminders(item, addNotification);

      // Immediate in-app notification
      addNotification({
        type: "warning",
        titleEn: "Appointment Confirmed",
        titleTwi: "Nhyiam Asi Ho",
        bodyEn: `${reason} at ${primaryHospital} on ${apptDate} ${apptTime}`,
        bodyTwi: `${reason} wɔ ${primaryHospital} ${apptDate} ${apptTime}`,
      });

      setPrimaryHospital(""); setBackupHospital(""); setApptDate(""); setApptTime(""); setReason("");
    } finally {
      setSavingAppt(false);
    }
  };

  const handleDeleteAppt = async (id) => {
    alarmCancellers.current[id]?.(); delete alarmCancellers.current[id];
    setAppts(prev => prev.filter(a => a.id !== id));
    await apptAPI.remove(accessToken, id);
  };

  const filteredPharmacies = LOCAL_PHARMACIES.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.district.toLowerCase().includes(search.toLowerCase())
  );

  const mapsNearbyUrl = coords
    ? `https://www.google.com/maps/search/pharmacy/@${coords.lat},${coords.lng},15z`
    : null;

  const formatApptDateTime = (date, time) => {
    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt)) return `${date} ${time}`;
    return dt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-surface mb-1">
        {lang === "twi" ? "Mmoa Nhwɛ" : "Care & Services"}
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm">
        {lang === "twi" ? "Hwɛ nnuro dwa ne yɛ nhyiam" : "Find nearby pharmacies, order prescription delivery, and book appointments"}
      </p>

      {/* Tab Switcher */}
      <div className="flex bg-surface-container rounded-2xl p-1 mb-6 border border-outline-variant">
        {[
          { id: "pharmacy",    label: { en: "Pharmacies",    twi: "Nnuro Dwa" },  Icon: MapPin },
          { id: "appointment", label: { en: "Appointments",  twi: "Hyia Nhyiam" }, Icon: Calendar },
        ].map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === id
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}>
            <Icon className="w-4 h-4" />
            <span>{lang === "twi" ? label.twi : label.en}</span>
          </button>
        ))}
      </div>

      {/* ═══ PHARMACY TAB ═══ */}
      {activeTab === "pharmacy" && (
        <div className="flex flex-col gap-4">

          {/* Geolocation Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LocateFixed className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-semibold text-on-surface">
                  {lang === "twi" ? "Hwɛ Nnuro Dwa a Ɛbɛn Wo" : "Find Pharmacies Near Me"}
                </span>
              </div>
              <button onClick={requestLocation} disabled={geoLoading}
                className="text-xs text-primary font-semibold px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center gap-1">
                {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                {geoLoading ? (lang === "twi" ? "Rehwehwɛ..." : "Locating...") : (lang === "twi" ? "Fa Me Baabi" : "Use My Location")}
              </button>
            </div>

            {geoError && <p className="text-xs text-error">{geoError}</p>}

            {coords && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-on-surface-variant">
                  📍 {lang === "twi" ? "Wɔ hɔ:" : "Your location:"} {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
                <a
                  href={mapsNearbyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  {lang === "twi" ? "Yɛ Nnuro Dwa wɔ Google Maps" : "Open Nearest Pharmacies in Google Maps"}
                </a>
              </div>
            )}

            {!coords && !geoLoading && !geoError && (
              <p className="text-xs text-on-surface-variant">
                {lang === "twi"
                  ? "Fa wo baabi na yɛbɛhwehwɛ nnuro dwa a ɛbɛn wo."
                  : "Share your location to find pharmacies near you using Google Maps."}
              </p>
            )}
          </div>

          {/* Local Fallback Search */}
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            {lang === "twi" ? "Nnuro Dwa wɔ Kumasi" : "Nearby Pharmacies — Kumasi Area"}
          </p>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text"
              placeholder={lang === "twi" ? "Hwɛ nnuro dwa..." : "Search pharmacy or district..."}
              className="w-full h-13 pl-12 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
            />
          </div>

          <div className="flex flex-col gap-3">
            {filteredPharmacies.map(p => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;
              return (
                <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-on-surface text-sm">{p.name}</h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-outline" />{p.district}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={`tel:${p.phone}`} title="Call Pharmacy"
                        className="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center hover:bg-primary-container/40 transition-colors">
                        <Phone className="w-4 h-4" />
                      </a>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
                        className="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center hover:bg-primary-container/40 transition-colors">
                        <Navigation className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${p.open ? "bg-forest-green/10 text-forest-green border-forest-green/30" : "bg-surface-container-highest text-on-surface-variant border-outline-variant"}`}>
                        <Clock className="w-3 h-3" />{p.open ? (lang === "twi" ? "Abue" : "Open Now") : (lang === "twi" ? "Ato" : "Closed")}
                      </span>
                      {p.stock && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-primary-container/20 text-primary border border-primary/20 flex items-center gap-1">
                          <Pill className="w-3 h-3" />{lang === "twi" ? "Nnuro Wɔ Ho" : "Stock Verified"}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={() => { setSelectedPharmacyId(p.id); setShowDeliveryModal(true); }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /><span>{lang === "twi" ? "Soma" : "Order"}</span>
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

          <button type="button" onClick={() => setShowDeliveryModal(true)}
            className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
            <Truck className="w-5 h-5" />
            <span>{lang === "twi" ? "Bɔ Krataa Delivery" : "Request Prescription Delivery"}</span>
          </button>
        </div>
      )}

      {/* ═══ APPOINTMENT TAB ═══ */}
      {activeTab === "appointment" && (
        <div className="flex flex-col gap-4">

          {/* Upcoming Appointments */}
          {apptLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : appts.length > 0 && (
            <div className="flex flex-col gap-2 mb-2">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                {lang === "twi" ? "Nhyiam a Ɛreba" : "Upcoming Appointments"}
              </p>
              {appts.map(appt => (
                <div key={appt.id} className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-4 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">{appt.reason}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{appt.primaryHospital}</p>
                    {appt.backupHospital && (
                      <p className="text-xs text-on-surface-variant">Backup: {appt.backupHospital}</p>
                    )}
                    <p className="text-xs text-primary font-semibold mt-1">{formatApptDateTime(appt.date, appt.time)}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{appt.visitType === "virtual" ? "Virtual" : "In-Person"}</p>
                  </div>
                  <button onClick={() => handleDeleteAppt(appt.id)}
                    className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-full transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Book Appointment Form */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
            <h2 className="font-semibold text-sm text-on-surface mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              {lang === "twi" ? "Yɛ Nhyiam Foforo" : "Book New Appointment"}
            </h2>

            <form onSubmit={handleApptSubmit} className="flex flex-col gap-4">
              {/* Primary Hospital — free text */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Ayaresabea Titiriw" : "Primary Hospital / Clinic"}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
                  <input
                    type="text" required
                    placeholder={lang === "twi" ? "e.g. KNUST Hospital, Bomso Clinic..." : "e.g. KNUST Hospital, Bomso Clinic..."}
                    value={primaryHospital} onChange={e => setPrimaryHospital(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <RecentChips recentsKey="primary-hospital" onSelect={setPrimaryHospital} />
              </div>

              {/* Backup Hospital — free text */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Ayaresabea a Ɛtɔ so Mmienu (Backup)" : "Backup Healthcare Facility (optional)"}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder={lang === "twi" ? "e.g. KATH, Max City Medical Centre..." : "e.g. KATH, Max City Medical Centre..."}
                    value={backupHospital} onChange={e => setBackupHospital(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-3 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <RecentChips recentsKey="backup-hospital" onSelect={setBackupHospital} />
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Nhyiam Sɛn?" : "Consultation Mode"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setVisitType("inperson")}
                    className={`py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${visitType === "inperson" ? "bg-primary-container/40 border-primary text-primary" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"}`}>
                    <UserCheck className="w-4 h-4" />{lang === "twi" ? "Kɔ Ananmu" : "In-Person"}
                  </button>
                  <button type="button" onClick={() => setVisitType("virtual")}
                    className={`py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${visitType === "virtual" ? "bg-primary-container/40 border-primary text-primary" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant"}`}>
                    <Video className="w-4 h-4" />Virtual
                  </button>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Da" : "Date"}</label>
                  <input type="date" required value={apptDate} onChange={e => setApptDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary text-on-surface text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Bere" : "Time"}</label>
                  <input type="time" required value={apptTime} onChange={e => setApptTime(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary text-on-surface text-xs" />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Ayaresabea Asɛm" : "Reason for Appointment"}
                </label>
                <input type="text" required placeholder="e.g. Antenatal ANC checkup, lab test review..."
                  value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary" />
              </div>

              <button type="submit" disabled={savingAppt}
                className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 mt-1 disabled:opacity-70">
                {savingAppt ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                <span>{lang === "twi" ? "Hyɛ Nhyiam & Fa Kae" : "Confirm & Set Reminder"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Prescription Delivery Modal ═══ */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDeliveryModal(false)}>
          <div className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6 pb-8 border border-outline-variant max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <h2 className="font-headline text-headline-sm text-on-surface">{lang === "twi" ? "Bɔ Krataa Delivery" : "Prescription Delivery"}</h2>
              </div>
              <button type="button" onClick={() => setShowDeliveryModal(false)} className="p-1 rounded-full text-outline hover:text-on-surface"><X className="w-5 h-5" /></button>
            </div>

            {deliverySubmitted ? (
              <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-4 flex items-center gap-3 text-forest-green">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-medium">{lang === "twi" ? "W'aduro kɔ krado! Yɛbɛsoma ba wo nkyɛn." : "Delivery request submitted! The pharmacy will reach out shortly."}</span>
              </div>
            ) : (
              <form onSubmit={handleDeliverySubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Yi Nnurobea" : "Target Pharmacy"}</label>
                  <select value={selectedPharmacyId} onChange={e => setSelectedPharmacyId(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary">
                    {LOCAL_PHARMACIES.map(p => <option key={p.id} value={p.id}>{p.name} ({p.district})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Nnuro Din" : "Medication & Dosage Details"}</label>
                  <textarea rows={2} required placeholder={lang === "twi" ? "Nnuro din..." : "Prescription details (e.g. Folic acid 5mg, Ferrous sulfate)..."}
                    value={prescriptionText} onChange={e => setPrescriptionText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Fa Krataa no Hwɛ" : "Upload Doctor's Prescription (Optional)"}</label>
                  <label className="border border-dashed border-outline-variant hover:border-primary bg-surface-container-low rounded-xl p-3 flex flex-col items-center gap-1 cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-primary" />
                    <span className="text-xs text-on-surface">{fileAttached ? "Prescription attached ✓" : "Tap to upload image/PDF"}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={() => setFileAttached(true)} />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Wo ɛfie baabi..." : "Delivery Address & Landmark"}</label>
                  <input type="text" required placeholder="e.g. Kotei Junction, near KNUST campus"
                    value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">{lang === "twi" ? "Wo fon nɔma..." : "Contact Phone Number"}</label>
                  <input type="tel" required placeholder="+233 XX XXX XXXX"
                    value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm" />
                </div>
                <button type="submit" className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-xl active:scale-95 transition-transform mt-1">
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