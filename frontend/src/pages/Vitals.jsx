import { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { vitals as vitalsAPI } from "../services/api.js";
import { playNeuralSpeech, stopNeuralSpeech } from "../services/speech.js";
import {
  Loader2, AlertTriangle, CheckCircle2, HeartPulse,
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

function Sparkline({ values, color = "#84250f" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100, H = 30;
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
  const { lang, voiceLang } = useLang();
  const { accessToken } = useAuth();

  const [values, setValues] = useState({});
  const [history, setHistory] = useState({});
  const [histLoading, setHistLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      
      if (updatedRes && updatedRes.vitalStatus) {
        setEvaluation(updatedRes);
      } else {
        // Evaluate client side filtering for danger & attention factors only if offline
        const sys = parseFloat(values.bp_sys);
        const dia = parseFloat(values.bp_dia);
        const temp = parseFloat(values.temp);
        const sugar = parseFloat(values.sugar);

        const factorAssessments = [];
        const highFactors = [];
        const elevatedFactors = [];

        // BP
        if (!isNaN(sys) || !isNaN(dia)) {
          const s = sys || 120;
          const d = dia || 80;
          if (s >= 140 || d >= 90) {
            highFactors.push(`Blood Pressure (${s}/${d} mmHg)`);
            factorAssessments.push({
              factor: "Blood Pressure",
              value: `${s}/${d} mmHg`,
              status: "HIGH_WARNING",
              statusLabelEn: "DANGER — High BP / Pre-Eclampsia Risk",
              statusLabelTwi: "ƆHAW DENDEN — Mogya Soro Dodo",
              doctorActionsEn: [
                "Contact your ANC midwife or visit nearest hospital immediately for pre-eclampsia screening (proteinuria & BP check).",
                "Lie down on your left side immediately to increase blood flow to your baby and placenta."
              ],
              doctorActionsTwi: [
                "Kɔ asibiti anaa kasa kyerɛ wo nɛɛse ntɛm ara.",
                "Da wo benkum so ntɛm ma mogya nkɔ wo ba hɔ yie."
              ],
              lifestyleCurbEn: [
                "Dramatically cut salt and sodium seasoning (avoid bouillon cubes/Maggi, salted fish).",
                "Eat potassium-rich Kontomire, green plantain, ripe bananas, and avocados.",
                "Rest for 30 minutes twice daily with elevated legs."
              ],
              lifestyleCurbTwi: [
                "Tew nkyene ne bouillon cubes so koraa.",
                "Di kontomire ne kwadu a potassium wɔ mu.",
                "Gye wo ho ahome nnɔnhwerew fa da biara."
              ]
            });
          } else if (s >= 125 || d >= 83) {
            elevatedFactors.push(`Blood Pressure (${s}/${d} mmHg)`);
            factorAssessments.push({
              factor: "Blood Pressure",
              value: `${s}/${d} mmHg`,
              status: "ELEVATED",
              statusLabelEn: "KEEP AN EYE ON — Mild Elevation",
              statusLabelTwi: "HWEHWƐ MU YIE — Mogya Soro Kakra",
              doctorActionsEn: [
                "Mention this reading at your next ANC visit and monitor BP twice daily."
              ],
              doctorActionsTwi: [
                "Ka kyerɛ wo nɛɛse wɔ wo ANC visit a ɛreba no mu."
              ],
              lifestyleCurbEn: [
                "Limit salt in soups and drink 8+ glasses of clean water.",
                "Eat Kontomire greens and avoid heavy physical labor."
              ],
              lifestyleCurbTwi: [
                "Tew nkyene so na nom nsuo pii da biara."
              ]
            });
          }
        }

        // Temp
        if (!isNaN(temp)) {
          if (temp >= 38.0) {
            highFactors.push(`Body Temperature (${temp}°C)`);
            factorAssessments.push({
              factor: "Body Temperature",
              value: `${temp}°C`,
              status: "HIGH_WARNING",
              statusLabelEn: "DANGER — High Fever / Malaria Risk",
              statusLabelTwi: "ƆHAW DENDEN — Ho Hye Denden",
              doctorActionsEn: [
                "Go to the hospital or ANC clinic immediately for a Malaria Rapid Diagnostic Test (RDT).",
                "Take Paracetamol only if explicitly prescribed by your ANC midwife."
              ],
              doctorActionsTwi: [
                "Kɔ asibiti ntɛm ara kɔyɛ malaria test.",
                "Nom Paracetamol sɛ dɔkota anaa nɛɛse kyerɛɛ wo sɛ nom a."
              ],
              lifestyleCurbEn: [
                "Sip clean water or fresh coconut water continuously to avoid dehydration.",
                "Apply lukewarm damp cloth to forehead, neck, and armpits."
              ],
              lifestyleCurbTwi: [
                "Nom nsuo pa anaa nkutu nsuo pii da biara.",
                "Fa ntoma a nsuo wɔ mu bɔ wo mpotɔmu."
              ]
            });
          } else if (temp >= 37.3) {
            elevatedFactors.push(`Body Temperature (${temp}°C)`);
            factorAssessments.push({
              factor: "Body Temperature",
              value: `${temp}°C`,
              status: "ELEVATED",
              statusLabelEn: "KEEP AN EYE ON — Mild Fever",
              statusLabelTwi: "HWEHWƐ MU YIE — Ho Hye Kakra",
              doctorActionsEn: [
                "Monitor temperature every 4 hours. If it reaches 38°C, visit clinic."
              ],
              doctorActionsTwi: [
                "Hwɛ wo ho hye. Sɛ ɛkɔ 38°C a, kɔ asibiti."
              ],
              lifestyleCurbEn: [
                "Sip cool clean water and wear lightweight cotton clothing."
              ],
              lifestyleCurbTwi: [
                "Nom nsuo dɛdɛɛdɛ da biara."
              ]
            });
          }
        }

        // Sugar
        if (!isNaN(sugar)) {
          if (sugar >= 10.0) {
            highFactors.push(`Blood Sugar (${sugar} mmol/L)`);
            factorAssessments.push({
              factor: "Blood Sugar",
              value: `${sugar} mmol/L`,
              status: "HIGH_WARNING",
              statusLabelEn: "DANGER — High Glucose / Diabetes Risk",
              statusLabelTwi: "ƆHAW DENDEN — Mogya Sukaa Soro",
              doctorActionsEn: [
                "Schedule an Oral Glucose Tolerance Test (OGTT) with your ANC midwife.",
                "Keep a 3-day food & blood sugar log to show your doctor."
              ],
              doctorActionsTwi: [
                "Kasa kyerɛ wo nɛɛse ma wɔnhwɛ wo mogya sukaa yie.",
                "Kyerɛw aduane a wodi da biara mma dɔkota no nhwɛ."
              ],
              lifestyleCurbEn: [
                "Eliminate sodas/mineral drinks, refined white bread, and added sugars.",
                "Switch to complex fiber meals (boiled plantain, garden eggs, Kontomire).",
                "Take a 15-minute gentle walk after lunch and dinner."
              ],
              lifestyleCurbTwi: [
                "Kwati mineral drinks ne sukye dodo.",
                "Di bɔfrɛ, nyaadewa, ne bɔrodɛ a fiber wɔ mu.",
                "Nante kakra bɛyɛ simma 15 aduane akyi."
              ]
            });
          } else if (sugar >= 7.9) {
            elevatedFactors.push(`Blood Sugar (${sugar} mmol/L)`);
            factorAssessments.push({
              factor: "Blood Sugar",
              value: `${sugar} mmol/L`,
              status: "ELEVATED",
              statusLabelEn: "KEEP AN EYE ON — Elevated Glucose",
              statusLabelTwi: "HWEHWƐ MU YIE — Mogya Sukaa Soro Kakra",
              doctorActionsEn: [
                "Inform your ANC midwife about your blood sugar level at your next visit."
              ],
              doctorActionsTwi: [
                "Ka kyerɛ wo nɛɛse wɔ wo clinic visit a ɛreba no mu."
              ],
              lifestyleCurbEn: [
                "Replace soft drinks with clean water or unsweetened koko.",
                "Walk 15 minutes after main meals."
              ],
              lifestyleCurbTwi: [
                "Nom nsuo pa anaa koko a sukye nni mu."
              ]
            });
          }
        }

        const isHigh = highFactors.length > 0;
        const isElev = elevatedFactors.length > 0;

        const overallEn = isHigh
          ? `CRITICAL DANGER WARNING FOR ${highFactors.join(", ").toUpperCase()}: Immediate medical evaluation required! Your recorded ${highFactors.join(", ")} is dangerously high. Please visit a clinic immediately.`
          : isElev
          ? `ELEVATED READINGS TO KEEP AN EYE ON FOR ${elevatedFactors.join(", ").toUpperCase()}: Mild elevation detected in ${elevatedFactors.join(", ")}. Follow the clinical and lifestyle recommendations below.`
          : "EXCELLENT & HEALTHY: All recorded vital readings are within normal target range for a healthy pregnancy!";

        const overallTwi = isHigh
          ? `ƆHAW DENDEN — ${highFactors.join(", ").toUpperCase()}: Kɔ asibiti ntɛm ara! Wo ${highFactors.join(", ")} a woagye no wo soro dodo. Kasa kyerɛ wo nɛɛse ntɛm.`
          : isElev
          ? `HWEHWƐ MU YIE — ${elevatedFactors.join(", ").toUpperCase()}: Wo ${elevatedFactors.join(", ")} wo soro kakra. Di afotu a ɛwɔ aseɛ yi akyi.`
          : "APOMUDEN PA PAA: Wo apomuden nneɛma nyinaa kɔ so pɛpɛɛpɛ wɔ nyinsɛn mu!";

        setEvaluation({
          vitalStatus: isHigh ? "HIGH_WARNING" : isElev ? "ELEVATED" : "NORMAL",
          overallAssessmentEn: overallEn,
          overallAssessmentTwi: overallTwi,
          factorAssessments,
        });
      }

      if (typeof updatedRes === "object" && !updatedRes.vitalStatus) {
        setHistory(updatedRes);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.warn('[Vitals] Save notice:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSpeak = () => {
    if (!evaluation) return;
    if (speaking) {
      stopNeuralSpeech();
      setSpeaking(false);
      return;
    }

    const textToSpeak = lang === "twi"
      ? evaluation.overallAssessmentTwi
      : evaluation.overallAssessmentEn;

    setSpeaking(true);
    playNeuralSpeech(
      textToSpeak,
      voiceLang,
      () => setSpeaking(true),
      () => setSpeaking(false),
      () => setSpeaking(false)
    );
  };

  const startDiaryVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-US";
    r.onstart = () => setDiaryRec(true);
    r.onend = () => setDiaryRec(false);
    r.onresult = (e) => setDiary((prev) => prev + " " + e.results[0][0].transcript);
    recognitionRef.current = r;
    r.start();
  };

  // Filter out normal factors — ONLY show Danger & Keep An Eye On factors!
  const attentionFactors = (evaluation?.factorAssessments || []).filter(
    (f) => f.status === "HIGH_WARNING" || f.status === "ELEVATED"
  );

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <h1 className="font-headline text-headline-md text-on-background mb-1 flex items-center gap-2">
        <span>{lang === "twi" ? "Apomuden Nkae & Nhwehwɛmu" : "Daily Vitals & Health Evaluation"}</span>
        <Activity className="w-5 h-5 text-primary" />
      </h1>
      <p className="text-on-surface-variant mb-5 text-sm leading-relaxed">
        {lang === "twi"
          ? "Gye wo mogya tumi, hye ne sukaa nkae nnɛ ma yɛn-AI pipeline nhwehwɛ wo banbɔ mu mma wo afotu pa."
          : "Log today's blood pressure, temperature, & blood sugar to get instant clinical evaluation & guidance."}
      </p>

      {/* ═══ VITALS INPUT CARDS ═══ */}
      <div className="flex flex-col gap-4 mb-6">
        {VITALS_CONFIG.map((cfg) => {
          const status = getStatus(cfg, values[cfg.id]);
          const hist = history[cfg.id] || [];
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
              {histLoading ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {lang === "twi" ? "Ɛreloading..." : "Loading history..."}
                </div>
              ) : hist.length >= 2 && (
                <div className="mt-3">
                  <p className="text-xs text-on-surface-variant mb-1">
                    {lang === "twi" ? "Nkae nnansa" : "Recent trend"}
                  </p>
                  <Sparkline values={hist} />
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
        className="w-full bg-primary text-on-primary font-headline text-button py-4 rounded-2xl active:scale-95 transition-transform mb-6 flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <HeartPulse className="w-5 h-5" />
        )}
        <span>
          {saved
            ? (lang === "twi" ? "Agye & Ankyerɛkyerɛ Yie! ✓" : "Saved & Evaluated! ✓")
            : (lang === "twi" ? "Kora So & Hwɛ Banbɔ" : "Save & Evaluate Vitals")}
        </span>
      </button>

      {/* ═══ SPECIFIC MATERNAL CLINICAL EVALUATION CARD ═══ */}
      {evaluation && (
        <div className="mb-6 animate-scale-in flex flex-col gap-4">
          {/* Main Status Header Card */}
          <div
            className={`rounded-3xl border p-5 md:p-6 shadow-md ${
              evaluation.vitalStatus === "HIGH_WARNING"
                ? "bg-error-container border-error/50 text-error"
                : evaluation.vitalStatus === "ELEVATED"
                ? "bg-earthen-ochre/10 border-earthen-ochre/40 text-earthen-ochre"
                : "bg-forest-green/10 border-forest-green/40 text-forest-green"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3 border-b border-current/15 pb-3">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    evaluation.vitalStatus === "HIGH_WARNING"
                      ? "bg-error text-white"
                      : evaluation.vitalStatus === "ELEVATED"
                      ? "bg-earthen-ochre text-white"
                      : "bg-forest-green text-white"
                  }`}
                >
                  {evaluation.vitalStatus === "HIGH_WARNING"
                    ? (lang === "twi" ? "🔴 HIA AYARESABEA DANGER" : "🔴 CLINICAL DANGER WARNING")
                    : evaluation.vitalStatus === "ELEVATED"
                    ? (lang === "twi" ? "🟡 HWEHWƐ MU YIE" : "🟡 KEEP AN EYE ON THIS")
                    : (lang === "twi" ? "🟢 APOMUDEN PA" : "🟢 ALL VITALS HEALTHY & NORMAL")}
                </span>
                <h2 className="font-headline font-bold text-lg text-on-surface">
                  {lang === "twi" ? "Maternal Health Evaluation" : "Maternal Health Evaluation"}
                </h2>
              </div>

              {/* Read Aloud Button */}
              <button
                onClick={handleToggleSpeak}
                aria-label="Read health evaluation aloud"
                className={`p-2 rounded-full border transition-all ${
                  speaking
                    ? "bg-primary text-on-primary border-primary animate-pulse"
                    : "bg-surface-container hover:bg-surface-container-high text-primary border-outline-variant"
                }`}
              >
                {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Dynamic Specific Assessment Statement */}
            <p className="text-sm font-semibold leading-relaxed text-on-surface">
              {lang === "twi" ? evaluation.overallAssessmentTwi : evaluation.overallAssessmentEn}
            </p>
          </div>

          {/* DANGER & ATTENTION FACTORS CARDS ONLY (Normal factors strictly filtered out) */}
          {attentionFactors.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-error uppercase tracking-wider px-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-error" />
                <span>
                  {lang === "twi"
                    ? "Ɔhaw ne Nneɛma a ɛnsɛ sɛ woma wo ani da so (Danger Signs & Factors to Keep an Eye On):"
                    : "Danger Signs & Factors to Keep an Eye On:"}
                </span>
              </h3>

              {attentionFactors.map((factor, idx) => {
                const isDanger = factor.status === "HIGH_WARNING";
                const docActions = lang === "twi" ? (factor.doctorActionsTwi || factor.recommendationsTwi) : (factor.doctorActionsEn || factor.recommendationsEn);
                const lifeActions = lang === "twi" ? (factor.lifestyleCurbTwi || factor.recommendationsTwi) : (factor.lifestyleCurbEn || factor.recommendationsEn);

                return (
                  <div
                    key={idx}
                    className={`bg-surface-container-lowest border rounded-2xl p-4 shadow-2xs transition-all ${
                      isDanger
                        ? "border-error/40 bg-error-container/15"
                        : "border-earthen-ochre/40 bg-earthen-ochre/10"
                    }`}
                  >
                    {/* Factor Header & Badge */}
                    <div className="flex items-center justify-between mb-3 border-b border-outline-variant/40 pb-2">
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

                    {/* Section 1: Doctor Consultation Actions */}
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

                    {/* Section 2: General Lifestyle & Dietary Ways to Curb It */}
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
