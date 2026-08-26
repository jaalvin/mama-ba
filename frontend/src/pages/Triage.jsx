import React, { useState } from "react";
import { api } from "../services/api.js";

export default function Triage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const symptomTiles = [
    { key: "severe_bleeding", icon: "🩸", titleEn: "Vaginal Bleeding", titleTw: "Mmogya gu", category: "maternal", isEmergency: true },
    { key: "severe_headache", icon: "🤯", titleEn: "Severe Headache / Blurred Vision", titleTw: "Tipyɛ den / Aniso biribiri", category: "maternal", isEmergency: true },
    { key: "high_fever", icon: "🤒", titleEn: "High Fever (>38.5°C)", titleTw: "Huraeɛ kɛseɛ", category: "maternal", isEmergency: true },
    { key: "swollen_ankles", icon: "🦶", titleEn: "Swollen Ankles & Face", titleTw: "Nan anaa anim a ɑhɔnohɔno", category: "maternal", isEmergency: false },
    { key: "abdominal_pain", icon: "🤰", titleEn: "Severe Abdominal Pain / Cramps", titleTw: "Yafunu ya kɛseɛ", category: "maternal", isEmergency: true },
    { key: "infant_fever", icon: "👶", titleEn: "Infant High Fever / Lethargy", titleTw: "Abofra huraeɛ kɛseɛ", category: "infant", isEmergency: true }
  ];

  const toggleSymptom = (key) => {
    setSelectedSymptoms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const runTriage = async () => {
    if (selectedSymptoms.length === 0) return;
    setEvaluating(true);

    const res = await api.evaluateTriage({
      symptomKeys: selectedSymptoms,
      symptomText: selectedSymptoms.join(" ")
    });

    setEvaluating(false);

    if (res && res.success && res.data) {
      setTriageResult(res.data);
      if (res.data.isRedFlag || res.data.highestSeverity === "HIGH" || res.data.hospitalReferralRequired) {
        setShowEmergencyModal(true);
      }
    } else {
      // Local fallback evaluation
      const hasEmergency = selectedSymptoms.some(s => 
        symptomTiles.find(t => t.key === s && t.isEmergency)
      );

      const fallback = {
        highestSeverity: hasEmergency ? "HIGH" : "MODERATE",
        isRedFlag: hasEmergency,
        hospitalReferralRequired: hasEmergency,
        emergencyNoticeEnglish: hasEmergency 
          ? "CRITICAL RED-FLAG ALERT: Proceed immediately to the nearest Ghana Health Service clinic or hospital."
          : "MONITOR & LOG: Rest, stay hydrated, and visit your local clinic if symptoms persist.",
        emergencyNoticeTwi: hasEmergency
          ? "ENERGENCY WARNING: Kɔ ayaresabea ntɛm ara! Ntwentwɛn wo nan aase."
          : "Hwɛ wo ho so brɛoo na nom nsuo pii.",
        recommendedAction: hasEmergency
          ? "IMMEDIATE REFERRAL: Call 112 / 193 or proceed to the nearest emergency center immediately."
          : "Visit your local GHS clinic for checkup."
      };
      setTriageResult(fallback);
      if (hasEmergency) setShowEmergencyModal(true);
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🚨</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Offline Symptom Triage</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          Select symptoms below to evaluate risk level using local GHS deterministic decision trees.
        </p>
      </div>

      {/* Visual Symptom Selector Grid */}
      <section className="grid grid-cols-2 gap-3">
        {symptomTiles.map(s => {
          const selected = selectedSymptoms.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSymptom(s.key)}
              className={`p-4 rounded-2xl border text-left flex flex-col items-start gap-2 transition-all shadow-xs ${
                selected
                  ? "bg-[#3D405B] text-white border-[#3D405B] ring-2 ring-[#E07A5F]"
                  : "bg-white text-[#2D231E] border-[#EBE3D7]"
              }`}
            >
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="font-bold text-xs leading-snug">{s.titleEn}</p>
                <p className={`text-[10px] mt-0.5 ${selected ? "text-white/80" : "text-[#7A6B63]"}`}>
                  {s.titleTw}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold self-end mt-1 ${
                s.isEmergency 
                  ? (selected ? "bg-red-500 text-white" : "bg-red-100 text-red-700")
                  : (selected ? "bg-amber-400 text-[#2D231E]" : "bg-gray-100 text-gray-700")
              }`}>
                {s.isEmergency ? "Red Flag" : "Watch"}
              </span>
            </button>
          );
        })}
      </section>

      {/* Action Button */}
      <button
        onClick={runTriage}
        disabled={selectedSymptoms.length === 0 || evaluating}
        className="w-full min-h-[52px] rounded-2xl bg-[#E07A5F] text-white font-bold text-base shadow-md active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {evaluating ? (
          <span>Running Offline Decision Tree...</span>
        ) : (
          <span>Evaluate Symptoms &amp; Risk Level →</span>
        )}
      </button>

      {/* Dynamic Triage Result Level Card */}
      {triageResult && (
        <section className={`p-5 rounded-2xl border shadow-sm ${
          triageResult.isRedFlag || triageResult.highestSeverity === "HIGH"
            ? "bg-red-50 border-red-200 text-red-900"
            : triageResult.highestSeverity === "MODERATE"
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-emerald-50 border-emerald-200 text-emerald-900"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-sm uppercase tracking-wider">
              Triage Level: {triageResult.highestSeverity}
            </span>
            <span className="text-xl">
              {triageResult.highestSeverity === "HIGH" ? "🚨" : triageResult.highestSeverity === "MODERATE" ? "⚠️" : "🟢"}
            </span>
          </div>

          <p className="font-bold text-sm mb-1">{triageResult.emergencyNoticeEnglish}</p>
          <p className="text-xs italic mb-3">{triageResult.emergencyNoticeTwi}</p>

          <p className="text-xs font-semibold bg-white/80 p-3 rounded-xl border border-black/10">
            📌 Action Plan: {triageResult.recommendedAction}
          </p>
        </section>
      )}

      {/* Screen 4b: Urgent Red-Flag Emergency Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-red-600 text-white rounded-3xl p-6 max-w-sm w-full border-4 border-white shadow-2xl flex flex-col items-center text-center animate-bounce-once">
            <div className="w-16 h-16 rounded-full bg-white text-red-600 flex items-center justify-center text-3xl font-extrabold mb-3 shadow-lg">
              ⚠️
            </div>

            <h2 className="text-xl font-extrabold uppercase tracking-wide">
              URGENT RED-FLAG EMERGENCY
            </h2>
            <h3 className="text-lg font-bold text-yellow-300 mt-1 mb-4">
              Kɔ ayaresabea ntɛm ara!
            </h3>

            <p className="text-sm text-white/90 leading-relaxed mb-6">
              Critical maternal or infant warning signs detected. Please proceed to the nearest Ghana Health Service clinic or hospital emergency room immediately.
            </p>

            <div className="w-full flex flex-col gap-3">
              <a
                href="tel:112"
                className="w-full py-3.5 px-4 bg-white text-red-600 font-extrabold rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <span>📞 Call National Ambulance (112)</span>
              </a>

              <a
                href="tel:193"
                className="w-full py-3.5 px-4 bg-yellow-400 text-red-900 font-extrabold rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 active:scale-95"
              >
                <span>🚑 Call Emergency Dispatch (193)</span>
              </a>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-2.5 bg-red-800 text-white font-semibold rounded-xl text-xs hover:bg-red-900"
              >
                Dismiss Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
