import { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { vitals as vitalsAPI } from "../services/api.js";
import { playNeuralSpeech, stopNeuralSpeech } from "../services/speech.js";
import {
  Loader2, AlertTriangle, CheckCircle2,
  Volume2, Square, Sparkles, Activity, Stethoscope, Leaf
} from "lucide-react";

const VITALS_CONFIG = [
  {
    id: "bp_sys",
    label: { en: "Blood Pressure (Systolic)", twi: "Mogya Tumi (Systolic)" },
    unit: "mmHg", type: "number", min: 70, max: 200, placeholder: "120",
    thresholds: [
      { max: 124, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 139, label: { en: "Elevated", twi: "Boro Kakra" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 999, label: { en: "High — See Doctor", twi: "Tumi — Kɔ Onyansafo" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "bp_dia",
    label: { en: "Blood Pressure (Diastolic)", twi: "Mogya Tumi (Diastolic)" },
    unit: "mmHg", type: "number", min: 40, max: 130, placeholder: "80",
    thresholds: [
      { max: 82, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 89, label: { en: "Elevated", twi: "Boro Kakra" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 999, label: { en: "High — See Doctor", twi: "Tumi — Kɔ Onyansafo" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "temp",
    label: { en: "Body Temperature", twi: "Onipa Hye" },
    unit: "°C", type: "number", min: 35, max: 42, placeholder: "36.6", step: "0.1",
    thresholds: [
      { max: 37.2, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 37.9, label: { en: "Low Fever", twi: "Hye Kakra" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 99, label: { en: "High Fever — Act Now", twi: "Hye Dɔɔso — Yɛ Ntɛm" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "sugar",
    label: { en: "Blood Sugar", twi: "Mogya Sukaa" },
    unit: "mmol/L", type: "number", min: 2, max: 20, placeholder: "5.5", step: "0.1",
    thresholds: [
      { max: 7.8, label: { en: "Normal", twi: "Pɛ" }, color: "text-forest-green bg-forest-green/10 border-forest-green/30" },
      { max: 9.9, label: { en: "Elevated", twi: "Boro Kakra" }, color: "text-earthen-ochre bg-earthen-ochre/10 border-earthen-ochre/30" },
      { max: 99, label: { en: "High — Seek Care", twi: "Dɔɔso — Kɔ Ayaresabea" }, color: "text-error bg-error-container border-error/30" },
    ],
  },
  {
    id: "weight",
    label: { en: "Weight", twi: "Boɔdeɛ" },
    unit: "kg", type: "number", min: 30, max: 200, placeholder: "65",
    thresholds: [
      { max: 999, label: { en: "Logged", twi: "Agye" }, color: "text-primary bg-primary-container/20 border-primary/30" },
    ],
  },
];

const TIMEFRAMES = [
  { id: "3d", label: { en: "3 Days", twi: "Nnansa 3" }, days: 3 },
  { id: "1w", label: { en: "1 Week", twi: "Nnawɔtwe 1" }, days: 7 },
  { id: "2w", label: { en: "2 Weeks", twi: "Nnawɔtwe 2" }, days: 14 },
  { id: "1m", label: { en: "1 Month", twi: "Bosome 1" }, days: 30 },
  { id: "2m", label: { en: "2 Months", twi: "Bosome 2" }, days: 60 },
];

function MultiTimeframeChart({ historyData, timeframeId, vitalConfig, lang }) {
  const tf = TIMEFRAMES.find((t) => t.id === timeframeId) || TIMEFRAMES[1];
  const rawList = historyData[vitalConfig.id] || [];
  const rawDates = historyData.dates || [];

  const sliceCount = Math.min(rawList.length, tf.days);
  const values = rawList.slice(-sliceCount);
  const dates = rawDates.slice(-sliceCount);

  if (values.length < 1) {
    return (
      <div className="py-6 text-center text-xs text-on-surface-variant italic">
        {lang === "twi" ? "Nkae biara nni hɔ ma bere yi." : "No logs available for this timeframe yet."}
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const latest = values[values.length - 1];
  const previous = values.length >= 2 ? values[values.length - 2] : null;
  const diff = previous !== null ? Number((latest - previous).toFixed(1)) : null;

  const W = 300, H = 80;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * (W - 20) + 10;
    const y = H - 15 - ((v - min) / range) * (H - 30);
    return { x, y, v, date: dates[i] || `Day ${i + 1}` };
  });

  const polylinePts = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-on-surface-variant">
            {lang === "twi" ? vitalConfig.label.twi : vitalConfig.label.en}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-on-surface">
              {latest} {vitalConfig.unit}
            </span>
            {diff !== null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  diff > 0
                    ? "bg-amber-500/10 text-amber-700 border border-amber-500/30"
                    : diff < 0
                    ? "bg-forest-green/10 text-forest-green border border-forest-green/30"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : "→ 0"} {vitalConfig.unit} {lang === "twi" ? "nnɛ/ɔkyena" : "vs prev"}
              </span>
            )}
          </div>
        </div>

        <div className="text-right text-[11px] text-on-surface-variant">
          <p>Avg: <span className="font-semibold text-on-surface">{avg}</span></p>
          <p>Min: {min} | Max: {max}</p>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible" preserveAspectRatio="none">
          <line x1="0" y1="15" x2={W} y2="15" stroke="currentColor" className="text-outline-variant/30" strokeDasharray="3,3" />
          <line x1="0" y1={H - 15} x2={W} y2={H - 15} stroke="currentColor" className="text-outline-variant/30" strokeDasharray="3,3" />

          {values.length >= 2 && (
            <polyline
              points={polylinePts}
              fill="none"
              stroke="#84250f"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="#84250f" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          ))}
        </svg>

        <div className="flex justify-between text-[10px] text-on-surface-variant mt-1 px-1">
          <span>{dates[0] || "Start"}</span>
          {dates.length > 2 && <span>{dates[Math.floor(dates.length / 2)]}</span>}
          <span>{dates[dates.length - 1] || "Latest"}</span>
        </div>
      </div>
    </div>
  );
}

function getStatus(config, val) {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return config.thresholds.find((t) => n <= t.max) || config.thresholds.at(-1);
}

export default function Vitals() {
  const { lang, voiceLang } = useLang();
  const { accessToken } = useAuth();

  const [values, setValues] = useState({});
  const [history, setHistory] = useState({});
  const [histLoading, setHistLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [selectedTimeframe, setSelectedTimeframe] = useState("1w");
  const [selectedGraphVital, setSelectedGraphVital] = useState("bp_sys");

  const [evaluation, setEvaluation] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  const [diary, setDiary] = useState("");
  const [diaryRecording, setDiaryRec] = useState(false);
  const recognitionRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    vitalsAPI.history(accessToken)
      .then((data) => {
        if (data && typeof data === "object") setHistory(data);
      })
      .catch(() => setHistory({}))
      .finally(() => setHistLoading(false));
  }, [accessToken]);

  const handleChange = (id, val) => setValues((prev) => ({ ...prev, [id]: val }));

  const getDailyComparison = (id) => {
    const list = history[id] || [];
    if (list.length < 2) return null;
    const latest = list[list.length - 1];
    const prev = list[list.length - 2];
    const diff = Number((latest - prev).toFixed(1));
    return { latest, prev, diff };
  };

  const handleSave = async () => {
    const hasValues = VITALS_CONFIG.some(({ id }) => values[id] !== undefined && values[id] !== "");
    if (!hasValues) {
      alert(lang === "twi" ? "Hyɛ vitals nkae no mu ansa na woakora so." : "Please enter at least one vital reading to evaluate and save.");
      return;
    }

    setSaving(true);
    setSaved(false);
    stopNeuralSpeech();
    setSpeaking(false);

    try {
      const readings = {};
      VITALS_CONFIG.forEach(({ id }) => {
        const v = parseFloat(values[id]);
        if (!isNaN(v)) readings[id] = v;
      });

      const updatedRes = await vitalsAPI.save(accessToken, readings);
      
      const freshHistory = await vitalsAPI.history(accessToken);
      if (freshHistory && typeof freshHistory === "object") setHistory(freshHistory);

      if (updatedRes && updatedRes.vitalStatus) {
        setEvaluation(updatedRes);
      } else {
        const sys = parseFloat(values.bp_sys);
        const dia = parseFloat(values.bp_dia);
        const temp = parseFloat(values.temp);

        const factorAssessments = [];
        if (!isNaN(sys) || !isNaN(dia)) {
          const s = sys || 120;
          const d = dia || 80;
          if (s >= 140 || d >= 90) {
            factorAssessments.push({
              factor: "Blood Pressure",
              value: `${s}/${d} mmHg`,
              status: "HIGH_WARNING",
              statusLabelEn: "DANGER — High BP / Pre-Eclampsia Risk",
              statusLabelTwi: "ƆHAW DENDEN — Mogya Soro Dodo",
              doctorActionsEn: ["Contact your ANC midwife or visit nearest hospital immediately."],
              doctorActionsTwi: ["Kɔ asibiti anaa kasa kyerɛ wo nɛɛse ntɛm ara."],
              lifestyleCurbEn: ["Cut salt and sodium seasoning dramatically."],
              lifestyleCurbTwi: ["Tew nkyene so koraa."]
            });
          }
        }
        setEvaluation({
          vitalStatus: factorAssessments.length > 0 ? "HIGH_WARNING" : "NORMAL",
          factorAssessments
        });
      }

      setSaved(true);
    } catch (e) {
      alert(e.message || "Failed to save vitals.");
    } finally {
      setSaving(false);
    }
  };

  const startDiaryVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert(lang === "twi" ? "Wo browser nni nne nhyɛsoɔ ho kwan." : "Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SpeechRec();
    r.lang = lang === "twi" ? "ak-GH" : "en-US";
    r.continuous = false;
    r.interimResults = false;

    r.onstart = () => setDiaryRec(true);
    r.onend = () => setDiaryRec(false);
    r.onerror = () => setDiaryRec(false);
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setDiary((prev) => (prev ? prev + " " + t : t));
    };

    recognitionRef.current = r;
    r.start();
  };

  const attentionFactors = (evaluation?.factorAssessments || []).filter(
    (f) => f.status === "HIGH_WARNING" || f.status === "ELEVATED"
  );

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <h1 className="font-headline text-headline-md text-on-background mb-1 flex items-center gap-2">
        <span>{lang === "twi" ? "Apomuden Nkae & Nhwehwɛmu" : "Daily Vitals & Health Analytics"}</span>
        <Activity className="w-5 h-5 text-primary" />
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm leading-relaxed">
        {lang === "twi"
          ? "Gye wo mogya tumi, hye ne sukaa nkae nnɛ na hwɛ kwan a wo apomuden resesa fa."
          : "Log today's blood pressure, temperature, & blood sugar to track daily trends & clinical changes."}
      </p>

      {/* ═══ MULTI-TIMEFRAME ANALYTICS TABS ═══ */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 mb-6 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{lang === "twi" ? "Apomuden Nseseaeɛ" : "Vitals Progress Analytics"}</span>
          </h2>
          <span className="text-[11px] text-on-surface-variant font-medium">
            {lang === "twi" ? "Bere Hwɛ" : "Select Range"}
          </span>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="grid grid-cols-5 gap-1 bg-surface-container p-1 rounded-xl mb-3">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                selectedTimeframe === tf.id
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {lang === "twi" ? tf.label.twi : tf.label.en}
            </button>
          ))}
        </div>

        {/* Vital Metric Selector Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
          {VITALS_CONFIG.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => setSelectedGraphVital(cfg.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border whitespace-nowrap transition-colors ${
                selectedGraphVital === cfg.id
                  ? "bg-surface-container-high border-primary text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {lang === "twi" ? cfg.label.twi : cfg.label.en}
            </button>
          ))}
        </div>

        {/* Interactive Multi-Timeframe Chart */}
        {histLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>{lang === "twi" ? "Ɛreloading..." : "Loading chart..."}</span>
          </div>
        ) : (
          <MultiTimeframeChart
            historyData={history}
            timeframeId={selectedTimeframe}
            vitalConfig={VITALS_CONFIG.find((c) => c.id === selectedGraphVital) || VITALS_CONFIG[0]}
            lang={lang}
          />
        )}
      </div>

      {/* ═══ VITALS INPUT CARDS WITH DAILY COMPARISON ═══ */}
      <div className="flex flex-col gap-4 mb-6">
        {VITALS_CONFIG.map((cfg) => {
          const status = getStatus(cfg, values[cfg.id]);
          const comp = getDailyComparison(cfg.id);
          return (
            <div key={cfg.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label-md text-on-surface font-semibold text-xs">
                  {lang === "twi" ? cfg.label.twi : cfg.label.en}
                </label>
                {status && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${status.color}`}>
                    {lang === "twi" ? status.label.twi : status.label.en}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type={cfg.type}
                  min={cfg.min} max={cfg.max} step={cfg.step || "1"}
                  placeholder={cfg.placeholder}
                  value={values[cfg.id] || ""}
                  onChange={(e) => handleChange(cfg.id, e.target.value)}
                  className="flex-1 h-12 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-lg font-semibold"
                />
                <span className="text-on-surface-variant text-sm font-medium">{cfg.unit}</span>
              </div>

              {/* Daily Comparison Badge vs Yesterday */}
              {comp && comp.diff !== 0 && (
                <div className="mt-2.5 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-on-surface-variant font-medium">
                    {lang === "twi" ? "Ɛnnɛ vs Ɔkyena (Daily Comparison):" : "Daily Comparison:"}
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      comp.diff > 0
                        ? "text-amber-700 font-semibold"
                        : "text-forest-green font-semibold"
                    }`}
                  >
                    {comp.diff > 0 ? `↑ +${comp.diff}` : `↓ ${comp.diff}`} {cfg.unit}
                    <span className="text-[10px] text-on-surface-variant opacity-80">
                      ({comp.latest} vs {comp.prev})
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save & Evaluate Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all disabled:opacity-50 mb-6"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{lang === "twi" ? "Ɛrekora mu..." : "Evaluating Vitals..."}</span>
          </>
        ) : (
          <>
            <Stethoscope className="w-5 h-5" />
            <span>{lang === "twi" ? "Kora Mu & Hwehwɛ Banbɔ" : "Save Daily Vitals & Evaluate"}</span>
          </>
        )}
      </button>

      {/* ═══ CLINICAL EVALUATION RESULTS ═══ */}
      {evaluation && (
        <div className="mb-6 flex flex-col gap-4">
          {attentionFactors.length > 0 ? (
            <div className="flex flex-col gap-3">
              {attentionFactors.map((factor, idx) => {
                const isDanger = factor.status === "HIGH_WARNING";
                const docActions = lang === "twi" ? factor.doctorActionsTwi : factor.doctorActionsEn;
                const lifeActions = lang === "twi" ? factor.lifestyleCurbTwi : factor.lifestyleCurbEn;

                return (
                  <div
                    key={idx}
                    className={`border rounded-3xl p-5 shadow-sm transition-all ${
                      isDanger
                        ? "bg-error-container/20 border-error/40"
                        : "bg-amber-500/10 border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-headline font-bold text-base text-on-surface">
                          {factor.factor}
                        </span>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-surface-container text-on-surface border border-outline-variant">
                          {factor.value}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isDanger
                            ? "bg-error text-white border-error"
                            : "bg-earthen-ochre text-white border-earthen-ochre"
                        }`}
                      >
                        {lang === "twi" ? factor.statusLabelTwi : factor.statusLabelEn}
                      </span>
                    </div>

                    {docActions && docActions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] font-bold text-error uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-error shrink-0" />
                          <span>
                            {lang === "twi"
                              ? "Bere a worehwehwɛ Dɔkota anaa Nɛɛse (While Consulting Doctor / Midwife):"
                              : "While Consulting Your Doctor / Midwife:"}
                          </span>
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {docActions.map((act, aIdx) => (
                            <li key={aIdx} className="flex items-start gap-2 text-xs text-on-surface font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lifeActions && lifeActions.length > 0 && (
                      <div className="pt-2 border-t border-outline-variant/40">
                        <p className="text-[11px] font-bold text-forest-green uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Leaf className="w-3.5 h-3.5 text-forest-green shrink-0" />
                          <span>
                            {lang === "twi"
                              ? "Aduane ne Banbɔ kwan a wobɛfa so atew so (General Ways to Curb It & Stay Healthy):"
                              : "General Ways to Curb It & Stay Healthy:"}
                          </span>
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {lifeActions.map((act, lIdx) => (
                            <li key={lIdx} className="flex items-start gap-2 text-xs text-on-surface-variant font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-forest-green shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-forest-green font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {lang === "twi"
                  ? "Wo apomuden nneɛma nyinaa kɔ so pɛpɛɛpɛ. Ɔhaw anaa yareɛ biara nni mu nnɛ!"
                  : "All recorded vital readings are within normal target range. No danger signs or risks detected today!"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ HEALTH DIARY SECTION ═══ */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-5 shadow-2xs">
        <h2 className="font-headline text-headline-md text-on-surface mb-3 flex items-center gap-2">
          <span>{lang === "twi" ? "Apomuden Krataa" : "Health Diary"}</span>
          <Sparkles className="w-4 h-4 text-primary" />
        </h2>
        <textarea
          rows={4}
          value={diary}
          onChange={(e) => setDiary(e.target.value)}
          placeholder={
            lang === "twi"
              ? "Kyerɛ sɛn na wohunu ɛnnɛ... (How are you feeling today? Note any symptoms or concerns)"
              : "How are you feeling today? Note any symptoms, fetal movements, or concerns..."
          }
          className="w-full rounded-2xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary p-3.5 text-on-surface text-sm resize-none"
        />
        <button
          onClick={startDiaryVoice}
          className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-semibold transition-colors ${
            diaryRecording
              ? "bg-error text-on-error border-error animate-pulse"
              : "bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">mic</span>
          {diaryRecording
            ? (lang === "twi" ? "Mete..." : "Recording...")
            : (lang === "twi" ? "Kasa Fa Ho (Add Voice Note)" : "Add Voice Note")}
        </button>
      </div>
    </div>
  );
}
