import { useState, useRef } from "react";
import { useLang } from "../context/LanguageContext.jsx";

const VITALS_CONFIG = [
  {
    id: "bp_sys",
    label: { en: "Blood Pressure (Systolic)", twi: "Mogya Tumi (Systolic)" },
    unit: "mmHg",
    type: "number",
    min: 70,
    max: 200,
    placeholder: "120",
    thresholds: [
      { max: 119, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 139, label: { en: "Elevated", twi: "Boro" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 999, label: { en: "High — See Doctor", twi: "Tumi — Kɔ Onyansafo" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "bp_dia",
    label: { en: "Blood Pressure (Diastolic)", twi: "Mogya Tumi (Diastolic)" },
    unit: "mmHg",
    type: "number",
    min: 40,
    max: 130,
    placeholder: "80",
    thresholds: [
      { max: 79, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 89, label: { en: "Elevated", twi: "Boro" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 999, label: { en: "High — See Doctor", twi: "Tumi — Kɔ Onyansafo" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "temp",
    label: { en: "Body Temperature", twi: "Onipa Hye" },
    unit: "°C",
    type: "number",
    min: 35,
    max: 42,
    placeholder: "36.6",
    step: "0.1",
    thresholds: [
      { max: 37.2, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 38.0, label: { en: "Low Fever", twi: "Hye Kakra" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 99, label: { en: "High Fever — Act Now", twi: "Hye Dɔɔso — Yɛ Ntɛm" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "sugar",
    label: { en: "Blood Sugar", twi: "Mogya Sukaa" },
    unit: "mmol/L",
    type: "number",
    min: 2,
    max: 20,
    placeholder: "5.5",
    step: "0.1",
    thresholds: [
      { max: 7.8, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 10, label: { en: "Elevated", twi: "Boro" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 99, label: { en: "High — Seek Care", twi: "Dɔɔso — Kɔ Ayaresabea" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "weight",
    label: { en: "Weight", twi: "Boɔdeɛ" },
    unit: "kg",
    type: "number",
    min: 30,
    max: 200,
    placeholder: "65",
    thresholds: [
      { max: 999, label: { en: "Logged", twi: "Agye" }, color: "text-primary bg-primary-container/20 border-primary/30" },
    ],
  },
];

// Tiny sparkline SVG from an array of numbers
function Sparkline({ values, color = "#84250f" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100;
  const H = 30;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getStatus(config, val) {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return config.thresholds.find((t) => n <= t.max) || config.thresholds.at(-1);
}

export default function Vitals() {
  const { lang } = useLang();
  const [values, setValues] = useState({});
  const [history, setHistory] = useState({ bp_sys: [118, 122, 120, 125], bp_dia: [78, 80, 79, 82], temp: [36.5, 36.7, 36.6], sugar: [5.4, 5.6, 5.5], weight: [63, 63.5, 64] });
  const [diary, setDiary] = useState("");
  const [diaryRecording, setDiaryRecording] = useState(false);
  const recognitionRef = useRef(null);

  const handleChange = (id, val) => setValues((prev) => ({ ...prev, [id]: val }));

  const handleSave = () => {
    const updated = { ...history };
    VITALS_CONFIG.forEach(({ id }) => {
      const v = parseFloat(values[id]);
      if (!isNaN(v)) {
        updated[id] = [...(updated[id] || []), v].slice(-7);
      }
    });
    setHistory(updated);
    setValues({});
    alert(lang === "twi" ? "Agye yie!" : "Vitals saved!");
  };

  const startDiaryVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-US";
    r.onstart = () => setDiaryRecording(true);
    r.onend = () => setDiaryRecording(false);
    r.onresult = (e) => setDiary((prev) => prev + " " + e.results[0][0].transcript);
    recognitionRef.current = r;
    r.start();
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Apomuden Nkae" : "Daily Vitals Log"}
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm">
        {lang === "twi" ? "Gye wo apomuden nsɛm nnɛ" : "Record today's health readings"}
      </p>

      <div className="flex flex-col gap-4 mb-6">
        {VITALS_CONFIG.map((cfg) => {
          const status = getStatus(cfg, values[cfg.id]);
          return (
            <div key={cfg.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label-md text-on-surface">
                  {lang === "twi" ? cfg.label.twi : cfg.label.en}
                </label>
                {status && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                    {lang === "twi" ? status.label.twi : status.label.en}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type={cfg.type}
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step || "1"}
                  placeholder={cfg.placeholder}
                  value={values[cfg.id] || ""}
                  onChange={(e) => handleChange(cfg.id, e.target.value)}
                  className="flex-1 h-12 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-lg font-semibold"
                />
                <span className="text-on-surface-variant text-sm font-medium">{cfg.unit}</span>
              </div>
              {/* Sparkline history */}
              {history[cfg.id]?.length >= 2 && (
                <div className="mt-3">
                  <p className="text-xs text-on-surface-variant mb-1">
                    {lang === "twi" ? "Nkae nnansa" : "Recent trend"}
                  </p>
                  <Sparkline values={history[cfg.id]} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full bg-primary text-on-primary font-headline text-button py-4 rounded-full active:scale-95 transition-transform mb-6 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">save</span>
        {lang === "twi" ? "Gye Nkae" : "Save Vitals"}
      </button>

      {/* Health Diary */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
        <h2 className="font-headline text-headline-md text-on-surface mb-3">
          {lang === "twi" ? "Apomuden Krataa" : "Health Diary"}
        </h2>
        <textarea
          rows={4}
          value={diary}
          onChange={(e) => setDiary(e.target.value)}
          placeholder={
            lang === "twi"
              ? "Kyerɛ sɛn na wohunu ɛnnɛ..."
              : "How are you feeling today? Note any symptoms or concerns..."
          }
          className="w-full rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary p-3 text-on-surface text-sm resize-none"
        />
        <button
          onClick={startDiaryVoice}
          className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
            diaryRecording
              ? "bg-error text-on-error border-error animate-pulse"
              : "bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">mic</span>
          {diaryRecording
            ? (lang === "twi" ? "Mete..." : "Recording...")
            : (lang === "twi" ? "Kasa Fa Ho" : "Add Voice Note")}
        </button>
      </div>
    </div>
  );
}
