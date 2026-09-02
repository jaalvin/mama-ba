import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { Activity, Droplets, Thermometer, Footprints, Flame, Compass } from "lucide-react";

const SYMPTOMS = [
  { id: "headache", icon: Activity, en: "Headache", twi: "Tiawa", risk: "moderate" },
  { id: "bleeding", icon: Droplets, en: "Bleeding", twi: "Mogya tu", risk: "high" },
  { id: "fever", icon: Thermometer, en: "High Fever", twi: "Hye boro", risk: "high" },
  { id: "swollen", icon: Footprints, en: "Swollen Ankles", twi: "Nan abɔ ntonton", risk: "moderate" },
  { id: "abdominal", icon: Flame, en: "Abdominal Pain", twi: "Yafunu yaw", risk: "high" },
  { id: "dizziness", icon: Compass, en: "Dizziness", twi: "Tibɔ", risk: "moderate" },
];

const TRIAGE_LEVELS = {
  none: null,
  mild: {
    label: { en: "Mild — Self Care", twi: "Mmere — Wo Ho Adamfo" },
    color: "bg-forest-green/10 border-forest-green/30 text-forest-green",
    icon: "check_circle",
    advice: {
      en: "Your symptoms appear mild. Rest, hydrate, and monitor. Call your midwife if symptoms worsen.",
      twi: "Wo yadeɛ yɛ mmerɛ. Home, nom nsuo, na hwɛ. Frɛ wo ɔwɔfoɔ sɛ ɛsɔ boro.",
    },
  },
  moderate: {
    label: { en: "Moderate — Book Clinic Visit", twi: "Ewiem — Kɔ Ayaresabea" },
    color: "bg-earthen-ochre/10 border-earthen-ochre/30 text-earthen-ochre",
    icon: "calendar_month",
    advice: {
      en: "Please book a clinic visit within 24 hours. Do not ignore these symptoms.",
      twi: "Yɛ wo ara kɔ ayaresabea nnɔnhwerew 24 mu. Mma yadeɛ no nnye wo.",
    },
  },
  high: {
    label: { en: "High Risk — Urgent Emergency", twi: "Ɔhaw Kɛseɛ — Ntɛm Ara" },
    color: "bg-error-container border-error text-error",
    icon: "emergency",
    advice: {
      en: "This is an emergency. Go to the nearest clinic immediately.",
      twi: "Ɔhaw kɛseɛ ni. Kɔ ayaresabea ntɛm ara.",
    },
  },
};

function computeTriage(selected) {
  if (selected.length === 0) return "none";
  const risks = selected.map((id) => SYMPTOMS.find((s) => s.id === id)?.risk);
  if (risks.includes("high")) return "high";
  if (risks.includes("moderate")) return "moderate";
  return "mild";
}

export default function Triage() {
  const { lang } = useLang();
  const [selected, setSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const level = computeTriage(selected);
  const result = TRIAGE_LEVELS[level];
  const isEmergency = level === "high";

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Hwɛ Wo Yadeɛ" : "Check Symptoms"}
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm">
        {lang === "twi"
          ? "Yi yadeɛ a wohunu"
          : "Select all symptoms you are experiencing right now"}
      </p>

      {/* Visual Symptom Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
  {SYMPTOMS.map((s) => {
    const Icon = s.icon; // Assign component to a capitalized variable
    const isSelected = selected.includes(s.id);

    return (
      <button
        key={s.id}
        onClick={() => toggle(s.id)}
        className={`rounded-2xl border p-4 flex flex-col items-center gap-2 transition-all active:scale-95 ${
          isSelected
            ? "bg-primary text-on-primary border-primary shadow-md"
            : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-low"
        }`}
      >
              <Icon 
                className={`w-7 h-7 ${isSelected ? "text-on-primary" : "text-primary"}`} 
                strokeWidth={1.75} 
              />
              <span className="text-xs font-semibold text-center leading-tight">
                {lang === "twi" ? s.twi : s.en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Triage Result */}
      {result && (
        <div className={`rounded-2xl border p-5 mb-4 ${result.color}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-[28px]">{result.icon}</span>
            <h2 className="font-headline text-headline-md">
              {lang === "twi" ? result.label.twi : result.label.en}
            </h2>
          </div>
          <p className="text-sm leading-relaxed">
            {lang === "twi" ? result.advice.twi : result.advice.en}
          </p>
          {isEmergency && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 w-full bg-error text-on-error font-headline text-button py-3 rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">emergency</span>
              {lang === "twi" ? "Frɛ Mmoa Ntɛm" : "Get Emergency Help Now"}
            </button>
          )}
        </div>
      )}

      {/* Clear */}
      {selected.length > 0 && (
        <button
          onClick={() => setSelected([])}
          className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-full text-sm hover:bg-surface-container-low transition-colors"
        >
          {lang === "twi" ? "Tew nyinaa" : "Clear all symptoms"}
        </button>
      )}

      {/* Emergency Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-error z-50 flex flex-col items-center justify-center px-6 text-center">
          <span className="material-symbols-outlined text-on-error text-[72px] mb-4 animate-pulse">
            emergency
          </span>
          <h2 className="font-headline text-headline-lg text-on-error mb-2">
            {lang === "twi" ? "ƆHAW KƐSEƐ!" : "EMERGENCY!"}
          </h2>
          <p className="text-on-error text-lg font-semibold mb-2">
            Kɔ ayaresabea ntɛm ara
          </p>
          <p className="text-on-error/90 mb-8">
            Go to the nearest clinic immediately
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <a
              href="tel:112"
              className="bg-on-error text-error font-headline text-button py-4 rounded-full flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">call</span>
              Call 112 — National Ambulance
            </a>
            <a
              href="tel:193"
              className="bg-on-error/90 text-error font-headline text-button py-4 rounded-full flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">call</span>
              Call 193 — Emergency Services
            </a>
            <button
              onClick={() => setShowModal(false)}
              className="text-on-error/70 text-sm mt-2 underline"
            >
              {lang === "twi" ? "Sane kɔ" : "Go back"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
