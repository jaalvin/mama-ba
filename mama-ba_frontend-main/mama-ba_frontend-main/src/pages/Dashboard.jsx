import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { medications as medsAPI } from "../services/api.js";
import { showDeviceNotification, scheduleAlarm, nextOccurrenceMs } from "../services/notifications.js";
import {
  Baby, Leaf, HelpCircle, HeartPulse, MapPin,
  ChevronRight, Mic, Check, Clock, Plus, Trash2, Loader2,
  Calendar, CalendarCheck, X,
} from "lucide-react";

// Baby size lookup by gestational week
const BABY_SIZE = {
  4: { en: "a poppy seed", twi: "abɔ ketewa" },
  8: { en: "a raspberry", twi: "afrow" },
  12: { en: "a lime", twi: "ankaa ketewa" },
  16: { en: "an avocado", twi: "apɛrɛkɔ" },
  20: { en: "a banana", twi: "kwadu" },
  24: { en: "an ear of corn", twi: "aburoɔ" },
  28: { en: "an eggplant", twi: "ntroba" },
  32: { en: "a squash", twi: "aboɔ" },
  36: { en: "a honeydew melon", twi: "kwadu kesee" },
  40: { en: "a small watermelon", twi: "ɛkuankoa" },
};

function getBabySize(week) {
  if (!week) return null;
  const keys = Object.keys(BABY_SIZE).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, cur) =>
    Math.abs(cur - week) < Math.abs(prev - week) ? cur : prev
  );
  return BABY_SIZE[closest];
}

function computeWeek(dueDate) {
  if (!dueDate) return null;
  const msLeft = new Date(dueDate) - new Date();
  const weeksLeft = Math.max(0, Math.round(msLeft / (7 * 24 * 60 * 60 * 1000)));
  return Math.min(40, Math.max(1, 40 - weeksLeft));
}

function computeDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const msLeft = new Date(dueDate) - new Date();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export default function Dashboard() {
  const { user, updateUser, accessToken } = useAuth();
  const { lang } = useLang();
  const { addNotification } = useNotifications();
  const name = user?.name || (lang === "twi" ? "Ɛho" : "there");

  const week    = computeWeek(user?.dueDate);
  const size    = getBabySize(week);
  const daysLeft = computeDaysRemaining(user?.dueDate);
  const progressPercent = week ? Math.min(100, Math.round((week / 40) * 100)) : 0;
  const dashOff = week ? 251.2 - (week / 40) * 251.2 : 251.2;

  const [recording, setRecording] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [modalDueDate, setModalDueDate] = useState(user?.dueDate || "");

  // Medications
  const [meds, setMeds]           = useState([]);
  const [medsLoading, setMedsLoading] = useState(true);
  const [checked, setChecked]     = useState([]);
  const [addOpen, setAddOpen]     = useState(false);
  const [medName, setMedName]     = useState("");
  const [medTime, setMedTime]     = useState("");
  const [saving, setSaving]       = useState(false);

  // Alarm cleanup refs: map of medId → cancel function
  const alarmCancellers = useRef({});

  // ── Load medications ───────────────────────────────────────────────────────
  const loadMeds = useCallback(() => {
    if (!accessToken) return;
    setMedsLoading(true);
    medsAPI.list(accessToken)
      .then(setMeds)
      .catch(() => setMeds([]))
      .finally(() => setMedsLoading(false));
  }, [accessToken]);

  useEffect(() => { loadMeds(); }, [loadMeds]);

  // ── Schedule / reschedule alarms whenever med list changes ─────────────────
  useEffect(() => {
    // Cancel all existing alarms
    Object.values(alarmCancellers.current).forEach(fn => fn?.());
    alarmCancellers.current = {};

    meds.forEach((med) => {
      if (!med.time) return;
      try {
        const targetMs = nextOccurrenceMs(med.time);
        const cancel = scheduleAlarm(
          targetMs,
          lang === "twi" ? "Nnuro Bere!" : "Medication Time!",
          lang === "twi"
            ? `Bere a wubegye wo nnuro – ${med.label}`
            : `Time to take ${med.label}`
        );
        alarmCancellers.current[med.id] = cancel;

        // Also queue an in-app notification at the same time
        const delay = targetMs - Date.now();
        const inAppId = setTimeout(() => {
          addNotification({
            type: "reminder",
            titleEn: "Medication Time!",
            titleTwi: "Nnuro Bere!",
            bodyEn: `Time to take ${med.label}`,
            bodyTwi: `Bere a wubegye wo nnuro – ${med.label}`,
          });
        }, delay);

        // Store both cancellers
        const prevCancel = alarmCancellers.current[med.id];
        alarmCancellers.current[med.id] = () => {
          prevCancel?.();
          clearTimeout(inAppId);
        };
      } catch {
        /* ignore malformed time strings */
      }
    });

    return () => {
      Object.values(alarmCancellers.current).forEach(fn => fn?.());
    };
  }, [meds, lang, addNotification]);

  const toggleMed = (id) =>
    setChecked((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAddMed = async (e) => {
    e.preventDefault();
    if (!medName.trim() || !medTime.trim()) return;
    setSaving(true);
    try {
      const item = await medsAPI.create(accessToken, { label: medName.trim(), time: medTime.trim() });
      setMeds((prev) => [...prev, item]);
      setMedName(""); setMedTime(""); setAddOpen(false);

      // Immediate confirmation notification
      showDeviceNotification(
        lang === "twi" ? "Nnuro Fa Ho" : "Medication Added",
        lang === "twi"
          ? `${item.label} – wobɛkae wo sɛ wubegye ${item.time}`
          : `${item.label} — you'll be reminded at ${item.time}`
      );
      addNotification({
        type: "reminder",
        titleEn: "Medication Added",
        titleTwi: "Nnuro Fa Ho",
        bodyEn: `${item.label} — you'll be reminded daily at ${item.time}`,
        bodyTwi: `${item.label} – wobɛkae wo sɛ wubegye ${item.time}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMed = async (id) => {
    // Cancel the alarm for this med
    alarmCancellers.current[id]?.();
    delete alarmCancellers.current[id];

    await medsAPI.remove(accessToken, id);
    setMeds((prev) => prev.filter(m => m.id !== id));
    setChecked((prev) => prev.filter(x => x !== id));
  };

  const handleSaveModalDueDate = (e) => {
    e.preventDefault();
    if (!modalDueDate) return;
    updateUser({ dueDate: modalDueDate });
    setShowDueDateModal(false);
  };

  return (
    <div className="px-4 py-6 md:px-6 flex flex-col gap-6 max-w-lg mx-auto pb-24">

      {/* ═══ HERO PREGNANCY PROGRESS RING SECTION ═══ */}
      <section className="flex flex-col items-center text-center gap-2">
        {/* Circular Progress Display */}
        <div
          onClick={() => !week && setShowDueDateModal(true)}
          className={`relative w-40 h-40 mb-1 flex items-center justify-center transition-transform ${
            !week ? "cursor-pointer hover:scale-105 active:scale-95" : ""
          }`}
          title={!week ? "Tap to add your due date" : `Week ${week} of 40 (${progressPercent}%)`}
        >
          {/* SVG Progress Circle */}
          <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
            {/* Background track circle */}
            <circle
              className="text-surface-container-highest"
              cx="50"
              cy="50"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeWidth="7"
            />
            {/* Active progress arc based on due date */}
            {week && (
              <circle
                className="text-primary transition-all duration-1000 ease-out"
                cx="50"
                cy="50"
                fill="transparent"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray="251.2"
                strokeDashoffset={dashOff}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Center content inside the circular progress ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
            {week ? (
              <div className="flex flex-col items-center justify-center">
                {/* Pregnant woman badge with week number */}
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-0.5 shadow-inner">
                  <span className="material-symbols-outlined text-[20px] text-primary">pregnant_woman</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold font-headline leading-none text-primary">{week}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">/ 40</span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-primary font-bold mt-0.5">
                  {lang === "twi" ? "Nnawɔtwe" : "Weeks"}
                </span>
              </div>
            ) : (
              /* Circle around the pregnant woman icon when due date not set yet */
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-18 h-18 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary shadow-sm ring-4 ring-primary/5">
                  <span className="material-symbols-outlined text-4xl text-primary">pregnant_woman</span>
                </div>
                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>Set Due Date</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Greeting & Progress Text */}
        <h1 className="font-headline text-headline-md text-on-surface">
          {lang === "twi" ? `Akwaaba, ${name}` : `Hello, ${name}`}
        </h1>

        {week && size ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-on-surface text-sm font-semibold">
              {lang === "twi" ? `Wo ba su sɛ ${size.twi}!` : `Your baby is the size of ${size.en}!`}
            </p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {progressPercent}% {lang === "twi" ? "awie" : "completed"}
              </span>
              {daysLeft !== null && (
                <span>• {daysLeft === 0 ? "Due today!" : `${daysLeft} days remaining`}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
            <p className="text-on-surface-variant text-xs leading-relaxed">
              {lang === "twi"
                ? "Fa wo da a wobɛwoo no akye wo profile mu ma yɛnhyehyɛ wo nkɔsoɔ."
                : "Add your due date in your profile to see your pregnancy progress."}
            </p>
            <button
              onClick={() => setShowDueDateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === "twi" ? "Fa Wo Da Kyerɛ (Set Due Date)" : "Set Due Date Now"}</span>
            </button>
          </div>
        )}
      </section>

      {/* ═══ VOICE ASSISTANT MIC BUTTON ═══ */}
      <section className="flex flex-col items-center gap-3">
        <button
          onClick={() => setRecording(r => !r)}
          aria-label={lang === "twi" ? "Bisa me biribiara" : "Ask me anything"}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            recording ? "bg-error text-on-error" : "bg-primary text-on-primary"
          }`}
        >
          <Mic className="w-10 h-10" strokeWidth={1.5} />
        </button>
        {recording && (
          <div className="flex items-center gap-1 h-8">
            {[1,2,3,4,5,4,3,2,1].map((h, i) => (
              <span key={i} className="w-1 rounded-full bg-primary"
                style={{ height: `${h*6}px`, animation: `pulse 0.8s ease-in-out ${i*0.08}s infinite alternate` }} />
            ))}
          </div>
        )}
        <p className="text-on-surface-variant text-sm font-semibold">
          {lang === "twi" ? "Bisa me biribiara" : "Ask me anything"}
        </p>
      </section>

      {/* ═══ QUICK ACTIONS ═══ */}
      <section>
        <h2 className="font-headline text-headline-md text-on-surface mb-3">
          {lang === "twi" ? "Yɛ biribi ntɛm" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/maternal" className="bg-primary-container/30 border border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-primary-container/50 transition-colors">
            <Baby className="w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">{lang === "twi" ? "Maame & Ba" : "Maternal & Baby Tracker"}</span>
          </Link>
          <Link to="/app/safety" className="bg-forest-green/10 border border-forest-green/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-forest-green/20 transition-colors">
            <Leaf className="w-7 h-7 text-forest-green" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">{lang === "twi" ? "Afifide & Nnuro" : "Herbal & Medication Safety"}</span>
          </Link>
          <Link to="/app/triage" className="bg-secondary-container/30 border border-secondary/30 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-secondary-container/50 transition-colors">
            <HelpCircle className="w-7 h-7 text-secondary" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">{lang === "twi" ? "Nsɛmmisa (FAQs)" : "Maternal Health FAQs"}</span>
          </Link>
          <Link to="/app/vitals" className="bg-tertiary-container/20 border border-tertiary/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-tertiary-container/40 transition-colors">
            <HeartPulse className="w-7 h-7 text-tertiary" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">{lang === "twi" ? "Gye Apomuden Nkae" : "Log Daily Vitals"}</span>
          </Link>
          <Link to="/app/care" className="col-span-2 bg-secondary-container/20 border border-secondary/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-secondary-container/40 transition-colors">
            <MapPin className="w-7 h-7 text-secondary shrink-0" strokeWidth={1.5} />
            <div className="text-left flex-1">
              <span className="text-label-md text-on-surface block">{lang === "twi" ? "Hwɛ Adwumakuw a Ɛbɛn Wo" : "Find Nearby Pharmacy"}</span>
              <span className="text-sm text-on-surface-variant">{lang === "twi" ? "Ayaresabea ne Adwumakuw" : "Book appointments & order meds"}</span>
            </div>
            <ChevronRight className="ml-auto text-outline w-6 h-6" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* ═══ TODAY'S MEDICATIONS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline text-headline-md text-on-surface">
            {lang === "twi" ? "Nnuro Ɛnnɛ" : "Today's Medications"}
          </h2>
          <button
            onClick={() => setAddOpen(o => !o)}
            aria-label={lang === "twi" ? "Fa nnuro" : "Add medication"}
            className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {addOpen && (
          <form onSubmit={handleAddMed} className="mb-3 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-on-surface">{lang === "twi" ? "Fa Nnuro Foforo" : "Add Medication"}</p>
            <input
              type="text" required
              placeholder={lang === "twi" ? "Nnuro din (e.g. Iron & Folic Acid)" : "Medication name (e.g. Iron & Folic Acid)"}
              value={medName} onChange={e => setMedName(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">{lang === "twi" ? "Bere a wubegye" : "Time to take"}</label>
              <input
                type="time" required value={medTime} onChange={e => setMedTime(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAddOpen(false); setMedName(""); setMedTime(""); }}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                {lang === "twi" ? "Gyae" : "Cancel"}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {lang === "twi" ? "Fa Ho" : "Save"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
          {medsLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

          {!medsLoading && meds.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl opacity-40">medication</span>
              <p className="text-sm">{lang === "twi" ? "Nnuro biara nni hɔ" : "No medications added yet"}</p>
              <button onClick={() => setAddOpen(true)} className="text-xs text-primary font-semibold mt-1">
                + {lang === "twi" ? "Fa nnuro" : "Add one"}
              </button>
            </div>
          )}

          {!medsLoading && meds.length > 0 && (
            <div className="divide-y divide-outline-variant">
              {meds.map(med => (
                <div key={med.id} className="flex items-center gap-3 px-4 py-4">
                  <button onClick={() => toggleMed(med.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked.includes(med.id) ? "bg-forest-green border-forest-green" : "border-outline-variant"
                    }`}>
                    {checked.includes(med.id) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${checked.includes(med.id) ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                      {med.label}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {lang === "twi" ? `Gye ${med.time}` : `Take at ${med.time}`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteMed(med.id)} aria-label="Remove medication"
                    className="p-1.5 text-outline hover:text-error transition-colors rounded-full hover:bg-error/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ THIS WEEK TIP ═══ */}
      {week && (
        <section>
          <h2 className="font-headline text-headline-md text-on-surface mb-3">
            {lang === "twi" ? "Nnawɔtwe Yi Mu Afotu" : "This Week for You"}
          </h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="w-full h-48 bg-[#F8EFE6] relative overflow-hidden">
              <img src="https://media.istockphoto.com/id/2229743222/photo/pregnant-woman-in-therapy-session-mental-health-care.webp?a=1&b=1&s=612x612&w=0&k=20&c=SpsvNV36yQOW7rVv4C00R8KP8XiBzW8RVZwohmUKhOQ=" alt="Weekly Wellness Tip" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
            </div>
            <div className="p-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-[#964B22]">{lang === "twi" ? "Ahomegye ne Nsuonom" : "Rest & Hydration"}</span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "twi"
                  ? "Sɛ wo ba no renyini ntɛmntɛm nnawɔtwe yi a, wubetumi atumi abrɛ paa. Bɔ mmɔden nom nsuo kuruwa 8 da biara na ma wo nan so..."
                  : "As your baby grows rapidly this week, you might feel more fatigued. Aim for 8 glasses of water a day and elevate your feet when resting..."}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══ QUICK DUE DATE MODAL ═══ */}
      {showDueDateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDueDateModal(false)}
        >
          <div
            className="w-full max-w-sm bg-background border border-outline-variant rounded-3xl p-6 flex flex-col gap-4 shadow-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-headline font-bold text-base text-on-surface">
                  {lang === "twi" ? "Fa Wo Awoɔ Da Kyerɛ" : "Set Your Due Date"}
                </h2>
              </div>
              <button
                onClick={() => setShowDueDateModal(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {lang === "twi"
                ? "Fa da a wɔahyɛ sɛ wobɛwo no kyerɛ na yɛnkyerɛ wo ba no nkɔsoɔ wɔ fie ha."
                : "Enter your estimated delivery date to see how far your pregnancy has come."}
            </p>

            <form onSubmit={handleSaveModalDueDate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Awoɔ Da (Due Date):" : "Estimated Due Date:"}
                </label>
                <input
                  type="date"
                  required
                  value={modalDueDate}
                  onChange={(e) => setModalDueDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDueDateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  {lang === "twi" ? "Gyae" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!modalDueDate}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{lang === "twi" ? "Kora So" : "Save Progress"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}