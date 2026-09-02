import { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { ancAppointments as ancApptAPI, vaccines as vaccAPI } from "../services/api.js";
import { scheduleAlarm } from "../services/notifications.js";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Loader2, CalendarClock } from "lucide-react";

// ── WHO/GHS ANC Visit Definitions — Reference Guide (frontend-owned) ─────────
const WHO_VISITS = [
  { n: 1, title: "ANC Visit 1 (8–12 wks)",   desc: "Registration, dating scan, baseline labs & blood group." },
  { n: 2, title: "ANC Visit 2 (16 wks)",      desc: "Anomaly scan, fetal heart rate, 2nd TT dose." },
  { n: 3, title: "ANC Visit 3 (20 wks)",      desc: "Detailed anatomy scan & anaemia screening." },
  { n: 4, title: "ANC Visit 4 (24–26 wks)",   desc: "Glucose tolerance test & birth preparedness discussion." },
  { n: 5, title: "ANC Visit 5 (28 wks)",      desc: "Maternal mental health screening & nutrition check." },
  { n: 6, title: "ANC Visit 6 (32 wks)",      desc: "Group B Streptococcus test & birth plan review." },
  { n: 7, title: "ANC Visit 7 (36 wks)",      desc: "Cervical assessment & labour readiness." },
  { n: 8, title: "ANC Visit 8 (38–40 wks)",   desc: "Final check — facility, emergency plan & discharge." },
];

// ── Vaccine Definitions (WHO/GHS childhood schedule — frontend-owned) ─────────
const VACCINE_DEFS = [
  { id: "bcg",     label: "BCG (Birth)",      twi: "BCG (Abɔdeɛ)",    when: "At Birth" },
  { id: "opv0",    label: "OPV-0 (Birth)",    twi: "OPV-0 (Abɔdeɛ)", when: "At Birth" },
  { id: "penta1",  label: "Penta-1 + PCV-1",  twi: "Penta-1 + PCV-1", when: "6 Weeks" },
  { id: "penta2",  label: "Penta-2 + PCV-2",  twi: "Penta-2 + PCV-2", when: "10 Weeks" },
  { id: "penta3",  label: "Penta-3 + PCV-3",  twi: "Penta-3 + PCV-3", when: "14 Weeks" },
  { id: "rota1",   label: "Rotavirus-1",       twi: "Rotavirus-1",      when: "6 Weeks" },
  { id: "rota2",   label: "Rotavirus-2",       twi: "Rotavirus-2",      when: "10 Weeks" },
  { id: "measles", label: "Measles / MR",      twi: "Mfifide / MR",    when: "9 Months" },
];

// ── Alarm manager ──────────────────────────────────────────────────────────────
function scheduleApptAlarms(appt, addNotification) {
  const apptMs = new Date(`${appt.date}T${appt.time}`).getTime();
  if (isNaN(apptMs)) return () => {};

  const cancellers = [];

  const scheduleOne = (offsetMs, titleEn, bodyEn) => {
    const targetMs = apptMs - offsetMs;
    if (targetMs <= Date.now()) return;
    const cancel = scheduleAlarm(targetMs, titleEn, bodyEn);
    cancellers.push(cancel);
    const id = setTimeout(() => {
      addNotification({
        type: "warning",
        titleEn, titleTwi: titleEn,
        bodyEn, bodyTwi: bodyEn,
      });
    }, targetMs - Date.now());
    cancellers.push(() => clearTimeout(id));
  };

  scheduleOne(24 * 3600 * 1000, "Appointment Tomorrow", `${appt.title} at ${appt.hospital || "your clinic"} — ${appt.time}`);
  scheduleOne(     3600 * 1000, "Appointment in 1 Hour", `${appt.title} at ${appt.hospital || "your clinic"}`);

  return () => cancellers.forEach(fn => fn());
}

export default function Maternal() {
  const { lang }    = useLang();
  const { accessToken } = useAuth();
  const { addNotification } = useNotifications();

  // ── ANC Appointments ────────────────────────────────────────────────────────
  const [appts, setAppts]     = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [apptTitle,    setApptTitle]    = useState("");
  const [apptHospital, setApptHospital] = useState("");
  const [apptDate,     setApptDate]     = useState("");
  const [apptTime,     setApptTime]     = useState("");
  const [apptNotes,    setApptNotes]    = useState("");

  // WHO guide toggle
  const [guideOpen, setGuideOpen] = useState(false);

  // ── Vaccines ───────────────────────────────────────────────────────────────
  const [vaccStatus, setVaccStatus] = useState([]);
  const [vaccLoading, setVaccLoading] = useState(true);

  // ── Reminder toggles ───────────────────────────────────────────────────────
  const [reminders, setReminders] = useState({ anc: true, vacc: false });

  // Alarm cleanup refs: apptId → cancel fn
  const alarmCancellers = useRef({});

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    ancApptAPI.list(accessToken)
      .then(list => {
        setAppts(list);
        // Re-schedule alarms for all existing appointments
        list.forEach(appt => {
          if (!appt.done) {
            alarmCancellers.current[appt.id] = scheduleApptAlarms(appt, addNotification);
          }
        });
      })
      .catch(() => setAppts([]))
      .finally(() => setApptLoading(false));

    vaccAPI.listStatus(accessToken)
      .then(setVaccStatus)
      .catch(() => setVaccStatus([]))
      .finally(() => setVaccLoading(false));
  }, [accessToken, addNotification]);

  useEffect(() => {
    return () => Object.values(alarmCancellers.current).forEach(fn => fn?.());
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isVaccDone = (id) => vaccStatus.find(v => v.id === id)?.done ?? false;

  const handleAddAppt = async (e) => {
    e.preventDefault();
    if (!apptTitle.trim() || !apptDate || !apptTime) return;
    setSaving(true);
    try {
      const payload = {
        title:    apptTitle.trim(),
        hospital: apptHospital.trim(),
        date:     apptDate,
        time:     apptTime,
        notes:    apptNotes.trim(),
      };
      const item = await ancApptAPI.create(accessToken, payload);
      setAppts(prev => [...prev, item]);

      // Schedule alarms
      alarmCancellers.current[item.id] = scheduleApptAlarms(item, addNotification);

      // Immediate in-app notification
      addNotification({
        type: "warning",
        titleEn: "ANC Appointment Saved",
        titleTwi: "ANC Nhyiam Asi Ho",
        bodyEn: `${item.title} on ${item.date} at ${item.time}${item.hospital ? " — " + item.hospital : ""}`,
        bodyTwi: `${item.title} ${item.date} ${item.time}`,
      });

      setApptTitle(""); setApptHospital(""); setApptDate(""); setApptTime(""); setApptNotes("");
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDone = async (id, currentDone) => {
    const newDone = !currentDone;
    setAppts(prev => prev.map(a => a.id === id ? { ...a, done: newDone } : a));
    if (newDone) {
      alarmCancellers.current[id]?.();
      delete alarmCancellers.current[id];
    }
    await ancApptAPI.update(accessToken, id, { done: newDone });
  };

  const handleDeleteAppt = async (id) => {
    alarmCancellers.current[id]?.();
    delete alarmCancellers.current[id];
    setAppts(prev => prev.filter(a => a.id !== id));
    await ancApptAPI.remove(accessToken, id);
  };

  const handleVaccToggle = async (id) => {
    const newDone = !isVaccDone(id);
    setVaccStatus(prev => {
      const idx = prev.findIndex(v => v.id === id);
      const entry = { id, done: newDone };
      return idx >= 0 ? prev.map(v => v.id === id ? entry : v) : [...prev, entry];
    });
    await vaccAPI.toggle(accessToken, id, newDone);
  };

  const upcomingAppts = appts.filter(a => !a.done).sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const doneAppts     = appts.filter(a => a.done);

  const formatDateTime = (date, time) => {
    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt)) return `${date} ${time}`;
    return dt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Maame & Ba" : "Maternal & Childcare"}
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        {lang === "twi"
          ? "Hyehyɛ wo ANC nhyiam ne ba nnuro ahorow"
          : "Schedule your ANC visits and track your child's immunizations"}
      </p>

      {/* Reminder Toggles */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="text-label-md text-on-surface">{lang === "twi" ? "Kae Me Kae" : "Reminders"}</h2>
        {[
          { key: "anc",  label: { en: "ANC Visit Reminders (1h & 24h before)", twi: "ANC Nhwɛ Kae" } },
          { key: "vacc", label: { en: "Vaccine Due Alerts",                    twi: "Nnuro Bere Kae" } },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-on-surface">{lang === "twi" ? label.twi : label.en}</span>
            <button
              type="button"
              onClick={() => setReminders(r => ({ ...r, [key]: !r[key] }))}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${reminders[key] ? "bg-primary" : "bg-outline-variant"}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform shadow ${reminders[key] ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* ── ANC Appointments Section ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline text-headline-md text-on-surface">
          {lang === "twi" ? "Wo ANC Nhyiam" : "Your ANC Appointments"}
        </h2>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
          aria-label="Add appointment"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Add Appointment Form */}
      {formOpen && (
        <form onSubmit={handleAddAppt} className="mb-4 bg-surface-container-lowest border border-primary/30 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-on-surface">{lang === "twi" ? "ANC Nhyiam Foforo" : "New ANC Appointment"}</p>

          <input
            type="text" required maxLength={60}
            placeholder={lang === "twi" ? "Din (e.g. ANC Visit 3)" : "Visit name (e.g. ANC Visit 3)"}
            value={apptTitle} onChange={e => setApptTitle(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
          />

          <input
            type="text" maxLength={80}
            placeholder={lang === "twi" ? "Ayaresabea (e.g. KNUST Hospital)" : "Hospital / Clinic name (e.g. KNUST Hospital)"}
            value={apptHospital} onChange={e => setApptHospital(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">{lang === "twi" ? "Da" : "Date"}</label>
              <input
                type="date" required value={apptDate} onChange={e => setApptDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">{lang === "twi" ? "Bere" : "Time"}</label>
              <input
                type="time" required value={apptTime} onChange={e => setApptTime(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <textarea
            rows={2} maxLength={200} placeholder={lang === "twi" ? "Nkae (optional)..." : "Notes e.g. bring ID, fasting required (optional)..."}
            value={apptNotes} onChange={e => setApptNotes(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
          />

          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              {lang === "twi" ? "Gyae" : "Cancel"}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              {lang === "twi" ? "Fa Ho" : "Save & Set Reminder"}
            </button>
          </div>
        </form>
      )}

      {/* Appointments List */}
      {apptLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : appts.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col items-center gap-2 py-8 text-on-surface-variant mb-6">
          <CalendarClock className="w-8 h-8 opacity-30" />
          <p className="text-sm">{lang === "twi" ? "Nhyiam biara nni hɔ" : "No appointments yet"}</p>
          <p className="text-xs opacity-70 text-center px-6">
            {lang === "twi"
              ? "Fa wo nhyiam na yɛbɛkae wo 24h ne 1h ansa."
              : "Add your visits and we'll remind you 24h and 1h before each one."}
          </p>
          <button onClick={() => setFormOpen(true)} className="text-xs text-primary font-semibold mt-1">
            + {lang === "twi" ? "Fa nhyiam foforo" : "Add first appointment"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {upcomingAppts.map(appt => (
            <div key={appt.id} className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-on-surface">{appt.title}</p>
                  {appt.hospital && <p className="text-xs text-on-surface-variant mt-0.5">{appt.hospital}</p>}
                  <p className="text-xs text-primary font-semibold mt-1">{formatDateTime(appt.date, appt.time)}</p>
                  {appt.notes && <p className="text-xs text-on-surface-variant mt-1 italic">{appt.notes}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleToggleDone(appt.id, appt.done)}
                    className="w-7 h-7 rounded-full border-2 border-forest-green flex items-center justify-center hover:bg-forest-green/10 transition-colors">
                    <Check className="w-4 h-4 text-forest-green" strokeWidth={2.5} />
                  </button>
                  <button onClick={() => handleDeleteAppt(appt.id)}
                    className="w-7 h-7 rounded-full text-outline hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {doneAppts.length > 0 && (
            <div className="flex flex-col gap-2 opacity-60">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-1">
                {lang === "twi" ? "Asiho" : "Completed"}
              </p>
              {doneAppts.map(appt => (
                <div key={appt.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm line-through text-on-surface-variant">{appt.title}</p>
                    <p className="text-xs text-outline">{appt.date} {appt.time}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleToggleDone(appt.id, appt.done)}
                      className="w-7 h-7 rounded-full bg-forest-green flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </button>
                    <button onClick={() => handleDeleteAppt(appt.id)}
                      className="w-7 h-7 rounded-full text-outline hover:text-error flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WHO Reference Guide (collapsible) */}
      <button
        onClick={() => setGuideOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 py-3 mb-3"
      >
        <span className="text-sm font-semibold text-on-surface">
          {lang === "twi" ? "WHO/GHS ANC Nhwɛ Kwan (Nsɛm)" : "WHO/GHS ANC Schedule — Reference Guide"}
        </span>
        {guideOpen ? <ChevronUp className="w-5 h-5 text-outline" /> : <ChevronDown className="w-5 h-5 text-outline" />}
      </button>

      {guideOpen && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden mb-6">
          {WHO_VISITS.map(v => (
            <div key={v.n} className="px-4 py-3">
              <p className="text-sm font-semibold text-on-surface">{v.title}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{v.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Immunization Tracker */}
      <h2 className="font-headline text-headline-md text-on-surface mb-4">
        {lang === "twi" ? "Ba Nnuro Nhyehyɛeɛ" : "Childhood Immunization Tracker"}
      </h2>

      {vaccLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden mb-6">
          {VACCINE_DEFS.map(v => {
            const done = isVaccDone(v.id);
            return (
              <button key={v.id} onClick={() => handleVaccToggle(v.id)}
                className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-surface-container-low transition-colors">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "bg-forest-green border-forest-green" : "border-outline-variant"}`}>
                  {done && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${done ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                    {lang === "twi" ? v.twi : v.label}
                  </p>
                  <p className="text-xs text-on-surface-variant">{v.when}</p>
                </div>
                {done && (
                  <span className="text-xs bg-forest-green/10 text-forest-green border border-forest-green/30 px-2 py-0.5 rounded-full font-semibold">
                    {lang === "twi" ? "Asi ho" : "Done"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
