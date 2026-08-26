import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";

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

// Safety matrix: herb_drug → { verdict, en, twi }
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
  neem_artemether: {
    verdict: "danger",
    en: "DANGER: Neem may significantly reduce the effectiveness of antimalarial treatment.",
    twi: "ƆHAW: Neem tumi sɛe antimalarial nnuro adwuma kɛseɛ.",
    rationale: {
      en: "Neem induces CYP450 liver enzymes which can rapidly metabolise antimalarial drugs, lowering their plasma concentration below the effective therapeutic range.",
      twi: "Neem ma liver enzymes dɔɔso a ɛtumi sɛe nnuro ntɛm, ma wɔn yɛ mmerɛ ara.",
    },
  },
  koko_iron: {
    verdict: "caution",
    en: "CAUTION: Koko (fermented cereal porridge) can inhibit iron absorption. Take iron supplement 1–2 hours before eating Koko.",
    twi: "ÈKA: Koko tumi sɛe iron nkɔ mu. Gye iron nnuro dɔnhwerew 1-2 ansa na wubedi Koko.",
    rationale: {
      en: "Phytic acid in fermented cereals forms complexes with iron, reducing its bioavailability. Separating intake by 1–2 hours allows proper iron absorption before the phytate effect occurs.",
      twi: "Phytic acid wɔ koko mu de iron kura, ma ɛntumi nkɔ mu yie. Fa dɔnhwerew 1-2 ntam na iron bɛtumi akɔ mu ansa phytate bɛyɛ adwuma.",
    },
  },
};

const VERDICT_CONFIG = {
  safe: {
    label: "🟢 SAFE",
    bg: "bg-forest-green/10 border-forest-green/40",
    text: "text-forest-green",
  },
  caution: {
    label: "🟡 CAUTION",
    bg: "bg-earthen-ochre/10 border-earthen-ochre/40",
    text: "text-earthen-ochre",
  },
  danger: {
    label: "🔴 DANGER",
    bg: "bg-error-container border-error/50",
    text: "text-error",
  },
};

export default function Safety() {
  const { lang } = useLang();
  const [herb, setHerb] = useState("");
  const [drug, setDrug] = useState("");

  const key = herb && drug ? `${herb}_${drug}` : null;
  const result = key ? MATRIX[key] || null : null;
  const verdict = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Apomuden Afifide & Nnuro" : "Herbal & Food Safety Checker"}
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        {lang === "twi"
          ? "Yi afifide ne nnuro na yɛahwɛ sɛ ɛho ho"
          : "Select a local herb/food and a medication to check compatibility"}
      </p>

      {/* Herb Picker */}
      <div className="mb-4">
        <label className="block text-label-md text-on-surface mb-2">
          <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-forest-green">spa</span>
          {lang === "twi" ? "Afifide / Aduane" : "Local Herb or Food"}
        </label>
        <select
          value={herb}
          onChange={(e) => setHerb(e.target.value)}
          className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
        >
          <option value="">{lang === "twi" ? "Yi afifide..." : "Select herb or food..."}</option>
          {HERBS.map((h) => (
            <option key={h.id} value={h.id}>
              {lang === "twi" ? h.twi : h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Drug Picker */}
      <div className="mb-6">
        <label className="block text-label-md text-on-surface mb-2">
          <span className="material-symbols-outlined text-[16px] align-middle mr-1 text-tertiary">medication</span>
          {lang === "twi" ? "Nnuro" : "Prescription Drug"}
        </label>
        <select
          value={drug}
          onChange={(e) => setDrug(e.target.value)}
          className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
        >
          <option value="">{lang === "twi" ? "Yi nnuro..." : "Select medication..."}</option>
          {DRUGS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Result */}
      {herb && drug && (
        result ? (
          <div className={`rounded-2xl border p-5 ${verdict.bg}`}>
            <p className={`font-headline text-headline-md mb-3 ${verdict.text}`}>
              {verdict.label}
            </p>
            <p className={`font-semibold mb-3 ${verdict.text}`}>
              {lang === "twi" ? result.twi : result.en}
            </p>
            <div className="border-t border-current/20 pt-3 mt-2">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                {lang === "twi" ? "Ɛdeɛn enti?" : "Why this happens"}
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "twi" ? result.rationale.twi : result.rationale.en}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-center">
            <span className="material-symbols-outlined text-[32px] text-outline mb-2">info</span>
            <p className="text-on-surface-variant text-sm">
              {lang === "twi"
                ? "Yɛnni ho nsɛm fa saa apem no ho. Bisa wo onipa adwumayɛfoɔ."
                : "No specific interaction data available for this combination. Please consult your healthcare provider."}
            </p>
          </div>
        )
      )}

      {!herb && !drug && (
        <div className="mt-6">
          <p className="text-label-md text-on-surface-variant mb-3">
            {lang === "twi" ? "Afifide dwumayɛ:" : "Common local herbs:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {HERBS.slice(0, 5).map((h) => (
              <button
                key={h.id}
                onClick={() => setHerb(h.id)}
                className="px-3 py-1.5 rounded-full bg-forest-green/10 text-forest-green border border-forest-green/20 text-sm font-medium hover:bg-forest-green/20 transition-colors"
              >
                {lang === "twi" ? h.twi : h.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}