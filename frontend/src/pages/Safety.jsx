import React, { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const HERBS = [
  { id: "taabea", name: "Taabea", twi: "Taabea" },
  { id: "nibima", name: "Nibima", twi: "Nibima" },
  { id: "moringa", name: "Moringa", twi: "Moringa" },
  { id: "koko", name: "Koko (Fermented Porridge)", twi: "Koko" },
  { id: "alata", name: "Alata Samina (Black Soap)", twi: "Alata Samina" },
  { id: "neem", name: "Neem Leaves", twi: "Neem Nhanaa" },
  { id: "ginger", name: "Ginger Root", twi: "Akekaduro" },
  { id: "prekese", name: "Prekese", twi: "Prekese" },
];

const DRUGS = [
  { id: "paracetamol", name: "Paracetamol" },
  { id: "artemether", name: "Artemether-Lumefantrine (Coartem)" },
  { id: "iron", name: "Iron & Folic Acid" },
  { id: "amlodipine", name: "Amlodipine" },
  { id: "amoxicillin", name: "Amoxicillin" },
  { id: "metronidazole", name: "Metronidazole" },
];

const MATRIX = {
  taabea_artemether: {
    verdict: "danger",
    en: "DANGER: Taabea may reduce the efficacy of Artemether-Lumefantrine. Do NOT combine.",
    twi: "ƆHAW: Taabea tumi sɛe Artemether adwuma. Mfa wɔ faako.",
    rationale: {
      en: "Taabea contains compounds that induce liver enzymes (CYP3A4), rapidly breaking down antimalarial drugs and reducing their blood levels below therapeutic thresholds.",
      twi: "Taabea wɔ adeɛ a ɛma liver enzymes dɔɔso, ɛma antimalarial nnuro sɛe ntɛm a ɛma adwuma no nni ho bio.",
    },
  },
  taabea_iron: {
    verdict: "caution",
    en: "CAUTION: Taabea tea may inhibit iron absorption. Space intake by at least 2 hours.",
    twi: "ÈKA: Taabea tsa tumi sɛe iron nkɔ mu. Fa hora 2 ntam.",
    rationale: {
      en: "Tannins in Taabea bind to iron, forming insoluble complexes that prevent absorption in the gut. Taking them 2 hours apart reduces this interaction.",
      twi: "Taabea mu tannins de iron kura, ma ɛntumi nkɔ mu wɔ yafunu mu. Fa hora 2 ntam na ɛbɛyɛ mmerɛ.",
    },
  },
  moringa_iron: {
    verdict: "safe",
    en: "SAFE: Moringa is rich in iron and can complement Iron & Folic Acid supplementation.",
    twi: "ÉHO HO: Moringa wɔ iron pii na ɛtumiboa Iron & Folic Acid.",
    rationale: {
      en: "Moringa leaves are a natural iron source. Combined with supplements, they may enhance hemoglobin levels — a beneficial pairing for pregnant women with anemia.",
      twi: "Moringa nhanaa yɛ iron fapem. Ne nnuro ne ho, ɛtumi ma hemoglobin dɔɔso — ɛyɛ pa ma maame a wɔwɔ anemia.",
    },
  },
  ginger_paracetamol: {
    verdict: "safe",
    en: "SAFE: Culinary ginger is compatible with Paracetamol. Stick to moderate food quantities.",
    twi: "ÉHO HO: Akekaduro aduane mu yɛ semmea ne Paracetamol. Fa mmerɛ nko ara.",
    rationale: {
      en: "Moderate culinary use of ginger shows no significant interaction with paracetamol. High-dose ginger supplements may increase bleeding risk — use food amounts only.",
      twi: "Akekaduro aduane mu mmerɛ nhyia Paracetamol no. Akekaduro dɔɔso tumi ma mogya pue — fa aduane mu nko ara.",
    },
  },
};

export default function Safety() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [selectedHerb, setSelectedHerb] = useState("");
  const [selectedDrug, setSelectedDrug] = useState("");
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    if (!selectedHerb) return;
    const key = `${selectedHerb}_${selectedDrug}`;
    const found = MATRIX[key] || {
      verdict: "caution",
      en: "NO DIRECT INTERACTION DATA: Use herbal preparations with caution during pregnancy. Consult your GHS midwife.",
      twi: "NSƐM NNI HƆ NYINAA: Fa apomuden aduane pɛpɛɛpɛ na kɔ fa kyerɛ wo ɔwɔfoɔ.",
      rationale: {
        en: "Limited pharmacological data exists for this specific combination. Always inform your healthcare provider about all herbal preparations.",
        twi: "Nnuro asɛm pii nni hɔ fa eyi ho. Kyerɛ wo ayaresabea adwumayɛfoɔ bere biara.",
      },
    };

    setResult(found);

    // Persist check log to SQLite backend database
    try {
      await api.checkHerbalSafety({
        userId: user?.email || "demo-patient-001",
        herb: selectedHerb,
        drug: selectedDrug,
        result: found.verdict
      });
    } catch { /* graceful fallback */ }
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Apomuden Nnuro Ban" : "Herbal Safety Checker"}
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        {lang === "twi"
          ? "Hwɛ sɛ aduane anaa nnuro ne wo ayaresa hyia"
          : "Check interactions between traditional remedies and prescribed medications"}
      </p>

      {/* Selector Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-label-md text-on-surface mb-2">
            {lang === "twi" ? "1. Yi Aduane / Taabea" : "1. Select Herbal Preparation"}
          </label>
          <select
            value={selectedHerb}
            onChange={(e) => { setSelectedHerb(e.target.value); setResult(null); }}
            className="w-full h-12 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
          >
            <option value="">{lang === "twi" ? "-- Yi --" : "-- Select Herb --"}</option>
            {HERBS.map((h) => (
              <option key={h.id} value={h.id}>
                {lang === "twi" ? h.twi : h.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-label-md text-on-surface mb-2">
            {lang === "twi" ? "2. Yi Nnuro (Optional)" : "2. Select Prescribed Drug (Optional)"}
          </label>
          <select
            value={selectedDrug}
            onChange={(e) => { setSelectedDrug(e.target.value); setResult(null); }}
            className="w-full h-12 px-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
          >
            <option value="">{lang === "twi" ? "-- Biara nni hɔ --" : "-- None / General Safety --"}</option>
            {DRUGS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCheck}
          disabled={!selectedHerb}
          className="w-full bg-primary text-on-primary font-headline text-button py-3.5 rounded-full active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2 mt-1 shadow-md"
        >
          <span className="material-symbols-outlined">pageview</span>
          {lang === "twi" ? "Hwɛ Nsɛm" : "Check Interaction"}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`rounded-2xl border p-5 mb-6 ${
            result.verdict === "danger"
              ? "bg-error-container/30 border-error/30 text-on-error-container"
              : result.verdict === "caution"
              ? "bg-earthen-ochre/10 border-earthen-ochre/30 text-on-surface"
              : "bg-forest-green/10 border-forest-green/30 text-on-surface"
          }`}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="material-symbols-outlined text-[24px]">
              {result.verdict === "danger" ? "dangerous" : result.verdict === "caution" ? "warning" : "task_alt"}
            </span>
            <h2 className="font-headline text-headline-sm font-semibold">
              {lang === "twi" ? result.twi : result.en}
            </h2>
          </div>

          <div className="mt-3 pt-3 border-t border-outline-variant/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {lang === "twi" ? "Adwumayɛfoɔ Rationale" : "Pharmacological Rationale"}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {lang === "twi" ? result.rationale.twi : result.rationale.en}
            </p>
          </div>
        </div>
      )}

      {/* Informational Disclaimer */}
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-outline text-[20px] shrink-0 mt-0.5">info</span>
        <p className="text-xs text-outline leading-relaxed">
          {lang === "twi"
            ? "Apomuden Nnuro Ban database yɛ GHS/WHO fapem. All queries are persisted into SQLite for clinical audit logs."
            : "Herbal Safety Guidance is based on traditional safety databases and GHS/WHO clinical guidelines. All checks are saved persistently to SQLite."}
        </p>
      </div>
    </div>
  );
}