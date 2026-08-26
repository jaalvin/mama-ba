import React, { useState } from "react";
import { api } from "../services/api.js";

export default function Safety() {
  const [activeSegment, setActiveSegment] = useState("triage"); // 'triage' or 'herbal'

  // Segment A: Triage State
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const symptomTiles = [
    { key: "severe_bleeding", icon: "🩸", titleEn: "Vaginal Bleeding", titleTw: "Mmogya gu", isEmergency: true },
    { key: "severe_headache", icon: "🤯", titleEn: "Severe Headache / Blurred Vision", titleTw: "Tipyɛ den / Aniso biribiri", isEmergency: true },
    { key: "high_fever", icon: "🤒", titleEn: "High Fever (>38.5°C)", titleTw: "Huraeɛ kɛseɛ", isEmergency: true },
    { key: "swollen_ankles", icon: "🦶", titleEn: "Swollen Ankles & Face", titleTw: "Nan anaa anim a ɑhɔnohɔno", isEmergency: false },
    { key: "abdominal_pain", icon: "🤰", titleEn: "Severe Abdominal Pain / Cramps", titleTw: "Yafunu ya kɛseɛ", isEmergency: true },
    { key: "infant_fever", icon: "👶", titleEn: "Infant High Fever / Lethargy", titleTw: "Abofra huraeɛ kɛseɛ", isEmergency: true }
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
          ? "IMMEDIATE REFERRAL: Call 112 / 193 or proceed to nearest emergency center."
          : "Visit your local GHS clinic for checkup."
      };
      setTriageResult(fallback);
      if (hasEmergency) setShowEmergencyModal(true);
    }
  };

  // Segment B: Herbal Matrix State
  const [herbName, setHerbName] = useState("Taabea");
  const [drugName, setDrugName] = useState("Iron Supplements");
  const [loadingHerbal, setLoadingHerbal] = useState(false);
  const [safetyResult, setSafetyResult] = useState(null);

  const localHerbsList = [
    { id: "Taabea", name: "Taabea Herbal Mixture", category: "Herbal Tonic" },
    { id: "Nibima", name: "Nibima (Cryptolepis sanguinolenta)", category: "Antimalarial Herb" },
    { id: "Moringa", name: "Moringa Tea / Powder", category: "Nutritional Supplement" },
    { id: "Fermented Koko", name: "Fermented Hausa Koko / Millet", category: "Local Food / Cereal" },
    { id: "Prekese", name: "Prekese (Tetrapleura tetraptera)", category: "Traditional Spice" },
    { id: "Alata Samina", name: "Alata Samina (African Black Soap)", category: "Topical / Skin" }
  ];

  const pharmaDrugsList = [
    { id: "Iron Supplements", name: "Iron & Folic Acid Tablets", category: "Prenatal Mineral" },
    { id: "Paracetamol", name: "Paracetamol / Acetaminophen", category: "Pain Relief" },
    { id: "Artemether-Lumefantrine", name: "Artemether-Lumefantrine (Coartem)", category: "Antimalarial Drug" },
    { id: "Amlodipine", name: "Amlodipine / Anti-hypertensive", category: "Blood Pressure Drug" },
    { id: "Calcium Supplement", name: "Calcium & Vitamin D Tablets", category: "Mineral Supplement" }
  ];

  const handleCheckSafety = async () => {
    setLoadingHerbal(true);
    const res = await api.checkHerbalSafety({ herbName, drugName });
    setLoadingHerbal(false);

    if (res && res.success && res.data) {
      setSafetyResult(res.data);
    } else {
      let riskLevel = "SAFE";
      let adviceEn = "Compatible combination when taken as directed.";
      let adviceTw = "Nnuane ne nnuru yi kɔ abira yie.";

      if (herbName === "Taabea" && drugName === "Paracetamol") {
        riskLevel = "CAUTION";
        adviceEn = "Space intake by 2 hours; concurrent high doses strain liver enzymes.";
        adviceTw = "Gyae dɔnhwerew mmienu ansa na woanom kooko aduro no nka paracetamol ho.";
      } else if (herbName === "Fermented Koko" && drugName.includes("Iron")) {
        riskLevel = "CAUTION";
        adviceEn = "Space fermented Koko cereal 2 hours away from iron supplements. High phytates inhibit iron absorption.";
        adviceTw = "Gyae dɔnhwerew mmienu berɛ a wonom koko ansa na woanom dadeɛ aduro no.";
      } else if (herbName === "Moringa" && drugName.includes("Amlodipine")) {
        riskLevel = "DANGER";
        adviceEn = "CRITICAL CONTRAINDICATION: Moringa lowers blood pressure significantly; combined with Amlodipine risks severe hypotension.";
        adviceTw = "KƆ ASOPITI NTƐM: Moringa sɔte mogya mmoroso gyae a mlodipine ka ho a mogya sɔte dodo.";
      }

      setSafetyResult({
        herbName,
        drugName,
        riskLevel,
        adviceEn,
        adviceTw
      });
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-5 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🚨</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Apomuden &amp; Safety Hub</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          Offline Symptom Triage &amp; Ghanaian Herbal Safety Matrix.
        </p>
      </div>

      {/* Top Segmented Switcher */}
      <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#EBE3D7] shadow-xs">
        <button
          onClick={() => setActiveSegment("triage")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSegment === "triage"
              ? "bg-[#3D405B] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          🚨 Symptom Triage
        </button>
        <button
          onClick={() => setActiveSegment("herbal")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSegment === "herbal"
              ? "bg-[#E07A5F] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          🌿 Herbal &amp; Food Checker
        </button>
      </div>

      {/* SEGMENT A: Symptom Triage */}
      {activeSegment === "triage" && (
        <div className="flex flex-col gap-5">
          <section className="grid grid-cols-2 gap-3">
            {symptomTiles.map(s => {
              const selected = selectedSymptoms.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSymptom(s.key)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col items-start gap-1.5 transition-all shadow-xs ${
                    selected
                      ? "bg-[#3D405B] text-white border-[#3D405B] ring-2 ring-[#E07A5F]"
                      : "bg-white text-[#2D231E] border-[#EBE3D7]"
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="font-bold text-xs leading-snug">{s.titleEn}</p>
                    <p className={`text-[10px] mt-0.5 ${selected ? "text-white/80" : "text-[#7A6B63]"}`}>
                      {s.titleTw}
                    </p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold self-end mt-1 ${
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

          <button
            onClick={runTriage}
            disabled={selectedSymptoms.length === 0 || evaluating}
            className="w-full min-h-[50px] rounded-2xl bg-[#E07A5F] text-white font-bold text-sm shadow-md active:scale-95 transition-transform disabled:opacity-50"
          >
            {evaluating ? "Evaluating Symptoms..." : "Evaluate Risk &amp; Escalation →"}
          </button>

          {triageResult && (
            <section className={`p-4 rounded-2xl border shadow-sm ${
              triageResult.isRedFlag || triageResult.highestSeverity === "HIGH"
                ? "bg-red-50 border-red-200 text-red-950"
                : triageResult.highestSeverity === "MODERATE"
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-xs uppercase">Triage Level: {triageResult.highestSeverity}</span>
                <span className="text-base">{triageResult.highestSeverity === "HIGH" ? "🚨" : "⚠️"}</span>
              </div>
              <p className="font-bold text-xs mb-1">{triageResult.emergencyNoticeEnglish}</p>
              <p className="text-[11px] italic mb-2">{triageResult.emergencyNoticeTwi}</p>
              <p className="text-[11px] font-semibold bg-white/80 p-2.5 rounded-xl border border-black/10">
                📌 Plan: {triageResult.recommendedAction}
              </p>
            </section>
          )}
        </div>
      )}

      {/* SEGMENT B: Herbal & Food Safety Matrix */}
      {activeSegment === "herbal" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6B63] mb-1">
                Select Ghanaian Herb or Food:
              </label>
              <select
                value={herbName}
                onChange={(e) => setHerbName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-xs text-[#2D231E]"
              >
                {localHerbsList.map(h => (
                  <option key={h.id} value={h.id}>{h.name} ({h.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6B63] mb-1">
                Select Pharmaceutical Drug:
              </label>
              <select
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-xs text-[#2D231E]"
              >
                {pharmaDrugsList.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCheckSafety}
              disabled={loadingHerbal}
              className="mt-1 w-full h-11 rounded-xl bg-[#E07A5F] text-white font-bold text-xs shadow-sm active:scale-95 transition-transform"
            >
              {loadingHerbal ? "Checking Matrix..." : "Verify Safety & Interaction →"}
            </button>
          </div>

          {safetyResult && (
            <section className={`p-4 rounded-2xl border shadow-sm ${
              safetyResult.riskLevel === "DANGER"
                ? "bg-red-50 border-red-300 text-red-950"
                : safetyResult.riskLevel === "CAUTION"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : "bg-emerald-50 border-emerald-300 text-emerald-950"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  safetyResult.riskLevel === "DANGER" ? "bg-red-600 text-white" : safetyResult.riskLevel === "CAUTION" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                }`}>
                  {safetyResult.riskLevel}
                </span>
                <span className="text-[11px] font-bold text-[#7A6B63]">{herbName} + {drugName}</span>
              </div>
              <p className="font-bold text-xs leading-snug">{safetyResult.adviceEn}</p>
              <p className="text-[11px] italic opacity-90 mt-1">💬 Twi: {safetyResult.adviceTw}</p>
            </section>
          )}
        </div>
      )}

      {/* Screen 4b: Red-Flag Emergency Modal Overlay */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-red-600 text-white rounded-3xl p-6 max-w-sm w-full border-4 border-white shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white text-red-600 flex items-center justify-center text-2xl font-extrabold mb-2 shadow-lg">
              ⚠️
            </div>
            <h2 className="text-lg font-extrabold uppercase tracking-wide">URGENT RED-FLAG EMERGENCY</h2>
            <h3 className="text-base font-bold text-yellow-300 mb-3">Kɔ ayaresabea ntɛm ara!</h3>
            <p className="text-xs text-white/90 leading-relaxed mb-5">
              Critical maternal warning signs detected. Proceed to nearest GHS hospital emergency center immediately.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <a href="tel:112" className="w-full py-3 bg-white text-red-600 font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2">
                📞 Call National Ambulance (112)
              </a>
              <a href="tel:193" className="w-full py-3 bg-yellow-400 text-red-900 font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2">
                🚑 Call Emergency Dispatch (193)
              </a>
              <button onClick={() => setShowEmergencyModal(false)} className="w-full py-2 bg-red-800 text-white font-semibold rounded-xl text-xs">
                Dismiss Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}