import React, { useState } from "react";
import { api } from "../services/api.js";

export default function Safety() {
  const [herbName, setHerbName] = useState("Taabea");
  const [drugName, setDrugName] = useState("Iron Supplements");
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const res = await api.checkHerbalSafety({ herbName, drugName });
    setLoading(false);

    if (res && res.success && res.data) {
      setSafetyResult(res.data);
    } else {
      // Local fallback matrix evaluation
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
        adviceTw,
        culturalAdviceEnglish: adviceEn,
        culturalAdviceTwi: adviceTw
      });
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌿</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Apomuden Herbal &amp; Food Safety</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          On-device matrix checking contraindications between Ghanaian herbs, foods, and prescription drugs.
        </p>
      </div>

      {/* Selector Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#EBE3D7] shadow-sm flex flex-col gap-4">
        {/* Herb / Food Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-2">
            1. Select Ghanaian Herb or Food:
          </label>
          <select
            value={herbName}
            onChange={(e) => setHerbName(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-sm text-[#2D231E] focus:outline-none focus:border-[#E07A5F]"
          >
            {localHerbsList.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.category})
              </option>
            ))}
          </select>
        </div>

        {/* Drug Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-2">
            2. Select Pharmaceutical Drug:
          </label>
          <select
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-sm text-[#2D231E] focus:outline-none focus:border-[#E07A5F]"
          >
            {pharmaDrugsList.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.category})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCheckSafety}
          disabled={loading}
          className="mt-2 w-full h-12 rounded-xl bg-[#E07A5F] text-white font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {loading ? "Checking Apomuden Matrix..." : "Verify Safety & Interaction →"}
        </button>
      </div>

      {/* Safety Result Banner */}
      {safetyResult && (
        <section className={`p-5 rounded-2xl border shadow-sm ${
          safetyResult.riskLevel === "DANGER" || safetyResult.severity === "DANGER"
            ? "bg-red-50 border-red-300 text-red-950"
            : safetyResult.riskLevel === "CAUTION" || safetyResult.severity === "CAUTION"
            ? "bg-amber-50 border-amber-300 text-amber-950"
            : "bg-emerald-50 border-emerald-300 text-emerald-950"
        }`}>
          <div className="flex items-center justify-between mb-3 border-b border-black/10 pb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
              safetyResult.riskLevel === "DANGER" || safetyResult.severity === "DANGER"
                ? "bg-red-600 text-white"
                : safetyResult.riskLevel === "CAUTION" || safetyResult.severity === "CAUTION"
                ? "bg-amber-500 text-white"
                : "bg-emerald-600 text-white"
            }`}>
              {safetyResult.riskLevel || safetyResult.severity || "SAFE"}
            </span>

            <span className="text-xs font-bold text-[#7A6B63]">
              {herbName} + {drugName}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-bold text-sm leading-snug">
              {safetyResult.adviceEn || safetyResult.culturalAdviceEnglish || safetyResult.interactionDetails}
            </p>

            <p className="text-xs italic opacity-90">
              💬 Twi Advice: {safetyResult.adviceTw || safetyResult.culturalAdviceTwi || "Gyae dɔnhwerew mmienu ansa na woanom aduro."}
            </p>

            <div className="mt-2 p-3 bg-white/80 rounded-xl border border-black/10 text-xs">
              <span className="font-bold text-[#E07A5F]">⏱️ Actionable Timing Rule:</span> Space intake by at least 2 hours from iron pills and antimalarials.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}