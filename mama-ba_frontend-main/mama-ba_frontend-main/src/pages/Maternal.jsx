import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";

const ANC_VISITS = [
  { n: 1, title: "ANC Visit 1", desc: "Initial registration, dating scan & baseline labs.", status: "done" },
  { n: 2, title: "ANC Visit 2", desc: "Anomaly scan, fetal heart rate, 2nd TT dose.", status: "done" },
  { n: 3, title: "ANC Visit 3", desc: "Glucose tolerance test & anaemia screening.", status: "next", location: "Korle Bu Teaching Hospital", when: "Oct 12, 2026 — 09:00 AM" },
  { n: 4, title: "ANC Visit 4", desc: "Growth scan & birth preparedness discussion.", status: "upcoming" },
  { n: 5, title: "ANC Visit 5", desc: "Maternal mental health screening & nutrition check.", status: "upcoming" },
  { n: 6, title: "ANC Visit 6", desc: "Group B Streptococcus test & birth plan review.", status: "upcoming" },
  { n: 7, title: "ANC Visit 7", desc: "Cervical assessment & labour readiness.", status: "upcoming" },
  { n: 8, title: "ANC Visit 8", desc: "Final check — facility, emergency plan & discharge.", status: "upcoming" },
];

const VACCINES = [
  { id: "bcg", label: "BCG (Birth)", twi: "BCG (Abɔdeɛ)", when: "At Birth" },
  { id: "opv0", label: "OPV-0 (Birth)", twi: "OPV-0 (Abɔdeɛ)", when: "At Birth" },
  { id: "penta1", label: "Penta-1 + PCV-1", twi: "Penta-1 + PCV-1", when: "6 Weeks" },
  { id: "penta2", label: "Penta-2 + PCV-2", twi: "Penta-2 + PCV-2", when: "10 Weeks" },
  { id: "penta3", label: "Penta-3 + PCV-3", twi: "Penta-3 + PCV-3", when: "14 Weeks" },
  { id: "rota1", label: "Rotavirus-1", twi: "Rotavirus-1", when: "6 Weeks" },
  { id: "rota2", label: "Rotavirus-2", twi: "Rotavirus-2", when: "10 Weeks" },
  { id: "measles", label: "Measles / MR", twi: "Mfifide / MR", when: "9 Months" },
];

export default function Maternal() {
  const { lang } = useLang();
  const [vaccDone, setVaccDone] = useState(["bcg", "opv0"]);
  const [reminders, setReminders] = useState({ anc: true, vacc: false });

  const toggleVacc = (id) =>
    setVaccDone((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Maame & Ba" : "Maternal & Childcare"}
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        {lang === "twi"
          ? "Hwɛ GHS/WHO kwan mu abɔdeɛ nhwɛ ne mmoframma nnuro"
          : "Track your GHS/WHO antenatal visits and your child's immunizations"}
      </p>

      {/* Reminder Toggles */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 mb-6 flex flex-col gap-3">
        <h2 className="text-label-md text-on-surface">
          {lang === "twi" ? "Kae Me Kae" : "Reminders"}
        </h2>
        {[
          { key: "anc", label: { en: "ANC Visit Reminders", twi: "ANC Nhwɛ Kae" } },
          { key: "vacc", label: { en: "Vaccine Due Alerts", twi: "Nnuro Bere Kae" } },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-on-surface">
              {lang === "twi" ? label.twi : label.en}
            </span>
            <button
              type="button"
              onClick={() => setReminders((r) => ({ ...r, [key]: !r[key] }))}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                reminders[key] ? "bg-primary" : "bg-outline-variant"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  reminders[key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ANC Timeline */}
      <h2 className="font-headline text-headline-md text-on-surface mb-4">
        {lang === "twi" ? "ANC Bere Kwan" : "Antenatal Care Timeline"}
      </h2>
      <div className="relative flex flex-col gap-0 mb-8">
        {ANC_VISITS.map((v, idx) => (
          <div key={v.n} className="flex gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm z-10 ${
                  v.status === "done"
                    ? "bg-forest-green text-white"
                    : v.status === "next"
                    ? "bg-primary text-on-primary shadow-lg"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {v.status === "done"
                  ? <span className="material-symbols-outlined text-[16px]">check</span>
                  : v.n}
              </div>
              {idx < ANC_VISITS.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[32px] ${v.status === "done" ? "bg-forest-green" : "bg-outline-variant"}`} />
              )}
            </div>
            {/* Content */}
            <div className={`mb-4 flex-1 rounded-2xl p-4 ${
              v.status === "next"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-lowest border border-outline-variant"
            }`}>
              <h3 className={`font-semibold text-sm ${v.status === "next" ? "text-on-primary" : "text-on-surface"}`}>
                {v.title}
              </h3>
              <p className={`text-xs mt-1 ${v.status === "next" ? "text-on-primary/90" : "text-on-surface-variant"}`}>
                {v.desc}
              </p>
              {v.status === "next" && (
                <div className="mt-3 bg-white/15 rounded-xl p-3">
                  <p className="text-xs font-semibold">{v.location}</p>
                  <p className="text-xs">{v.when}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Immunization Tracker */}
      <h2 className="font-headline text-headline-md text-on-surface mb-4">
        {lang === "twi" ? "Ba Nnuro Nhyehyɛeɛ" : "Childhood Immunization Tracker"}
      </h2>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden mb-6">
        {VACCINES.map((v) => (
          <button
            key={v.id}
            onClick={() => toggleVacc(v.id)}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <span
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                vaccDone.includes(v.id)
                  ? "bg-forest-green border-forest-green"
                  : "border-outline-variant"
              }`}
            >
              {vaccDone.includes(v.id) && (
                <span className="material-symbols-outlined text-white text-[14px]">check</span>
              )}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${vaccDone.includes(v.id) ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                {lang === "twi" ? v.twi : v.label}
              </p>
              <p className="text-xs text-on-surface-variant">{v.when}</p>
            </div>
            {vaccDone.includes(v.id) && (
              <span className="text-xs bg-forest-green/10 text-forest-green border border-forest-green/30 px-2 py-0.5 rounded-full font-semibold">
                {lang === "twi" ? "Asi ho" : "Done"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
