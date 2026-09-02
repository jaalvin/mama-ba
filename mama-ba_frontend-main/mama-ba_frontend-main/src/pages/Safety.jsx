import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { getRecents, addRecent } from "../services/api.js";
import { Search, ShieldCheck } from "lucide-react";

// ── Database of Food & Herb Safety in Pregnancy / Lactation ────────────────
const FOOD_HERB_DATA = {
  moringa: {
    name: "Moringa (Leaves & Powder)",
    twi: "Moringa (Nhahan & Mfuturo)",
    verdict: "safe",
    en: "SAFE: Moringa leaves are nutrient-rich in iron, calcium, and vitamins.",
    twi: "ÉHO HO: Moringa nhahan wɔ iron, calcium ne vitamins pii a ɛboa wo ne wo ba no.",
    details: {
      en: "Leaves and cooked preparations are safe and helpful for anaemia in pregnancy. However, avoid concentrated root extracts or bark which may cause uterine contractions.",
      twi: "Nhahan a wɔanoa no yɛ pa ma mogya a ɛyɛ ketewa. Nanso kwati ntin anaa nsunsuanso a ɛhyɛ yafunu ma ɛtwetwe.",
    },
  },
  ginger: {
    name: "Ginger (Akekaduro)",
    twi: "Akekaduro",
    verdict: "safe",
    en: "SAFE in dietary amounts: Excellent for morning sickness and mild nausea.",
    twi: "ÉHO HO wɔ aduane mu: Ɛboa ma yafunu teetee ne feefe kɔ fam.",
    details: {
      en: "Culinary amounts in tea or food are safe and effective for first-trimester nausea. Avoid extremely high-dose supplements.",
      twi: "Fa kakra gu tii anaa aduane mu ma ɛnhyɛ feefe so. Kwati supplements a ano yɛ den dodo.",
    },
  },
  koko: {
    name: "Hausa Koko / Fermented Porridge",
    twi: "Hausa Koko",
    verdict: "safe",
    en: "SAFE & Nourishing: Provides easily digestible energy.",
    twi: "ÉHO HO: Ɛma ahoɔden ntɛm na yafunu yam no mmerɛw.",
    details: {
      en: "Safe and hydrating. If taking iron supplements, space them 1-2 hours apart from whole grains for optimal iron absorption.",
      twi: "Ɛyɛ pa. Sɛ worenom iron nnuro a, gye nnɔnhwerew 1-2 ntam ansa na woanom koko na iron no akɔ wo nipadua mu yie.",
    },
  },
  prekese: {
    name: "Prekese (Aidan Fruit)",
    twi: "Prɛkɛsɛ",
    verdict: "caution",
    en: "CAUTION: Use sparingly in light soups; avoid strong medicinal decoctions.",
    twi: "ÈKA: Fa kakra bi gu nkwan mu; kwati nsuo a wɔanoa no denden sɛ aduro.",
    details: {
      en: "Small culinary amounts as soup flavouring are generally tolerated. Concentrated boiling or high consumption can stimulate uterine activity.",
      twi: "Kakra gu nkwan mu ma hua yɛ kwayɛ. Nanso nkwan a ano yɛ den anaa nsuo denden no betumi aka yafunu.",
    },
  },
  sobolo: {
    name: "Sobolo / Hibiscus Tea",
    twi: "Sobolo (Hibiscus)",
    verdict: "caution",
    en: "CAUTION: Limit intake during pregnancy.",
    twi: "ÈKA: Twe wo ho kakra wɔ nyinsɛn mu.",
    details: {
      en: "Hibiscus contains phytoestrogens and compounds that can stimulate menstruation or uterine blood flow in large quantities. Occasional light sips are okay, but avoid heavy daily consumption.",
      twi: "Sobolo a ano yɛ den betumi akanyan mogya kwan wɔ yafunu mu. Kwati nom pii da biara bere a wo yafunu da so ketewa.",
    },
  },
  taabea: {
    name: "Taabea Herbal Mixture",
    twi: "Taabea Aduro",
    verdict: "danger",
    en: "DANGER / AVOID: Not recommended during pregnancy.",
    twi: "ƆHAW / KWATI: Ɛnyɛ pa ma obaa a ɔyem.",
    details: {
      en: "Safety and dosage in pregnancy are unproven, and it strongly induces liver metabolic enzymes which can reduce vital nutrient and drug levels.",
      twi: "Wɔnhunuu sɛ ɛyɛ ma nyinsɛn na ebetumi asɛe nnuro pa a worenom ama wo apomuden no adwuma.",
    },
  },
  neem: {
    name: "Neem Leaves (Neem Nhahan)",
    twi: "Neem Nhahan",
    verdict: "danger",
    en: "DANGER / AVOID: Can stimulate uterine contractions and cause harm.",
    twi: "ƆHAW / KWATI: Ebetumi ama yafunu atwetwe na asɛe nyinsɛn.",
    details: {
      en: "Neem extracts have documented abortifacient and uterine-stimulating properties in clinical literature. Strictly avoid during all trimesters.",
      twi: "Neem wɔ ahoɔden a etumi tew nyinsɛn gu. Mfa mma obiara a ɔyem koraa.",
    },
  },
  unripe_pawpaw: {
    name: "Unripe / Semi-Ripe Pawpaw (Papaya)",
    twi: "Bɔfrɛ a Ɛmmenee",
    verdict: "danger",
    en: "DANGER: High latex and papain content can trigger uterine spasms.",
    twi: "ƆHAW: Bɔfrɛ bun mu nsuo betumi ama yafunu atwetwe ntɛm.",
    details: {
      en: "Unripe or green papaya contains concentrated latex which acts like oxytocin and prostaglandin, triggering early contractions. Fully ripe sweet papaya with orange flesh is safe in moderation.",
      twi: "Bɔfrɛ bun anaa nea enyinii yie wɔ nsuo a ɛka awotwaa. Nanso bɔfrɛ a abere pɛpɛɛpɛ a ne ho ayɛ kɔkɔɔ no yɛ safe kakra.",
    },
  },
};

// ── Database of Medication Safety in Pregnancy / Breastfeeding ─────────────
const DRUG_DATA = {
  paracetamol: {
    name: "Paracetamol (Acetaminophen)",
    twi: "Paracetamol",
    verdict: "safe",
    en: "SAFE First-Line: Recommended pain and fever relief in pregnancy.",
    twi: "ÉHO HO: Aduro a ɛyɛ ma tiyaw, eho yaw ne hye a ɛba.",
    details: {
      en: "Generally considered the safest analgesic and antipyretic in all trimesters when taken at standard recommended dosages (e.g. 500mg - 1000mg as needed, max 4g/day).",
      twi: "Ɛyɛ aduro a ɛbɔ wo ho ban bere a worenom sɛnea dɔkota anaa nɛɛse kyerɛe no.",
    },
  },
  iron_folic: {
    name: "Iron & Folic Acid",
    twi: "Iron & Folic Acid",
    verdict: "safe",
    en: "ESSENTIAL: Critical for baby's neural tube development and preventing maternal anaemia.",
    twi: "ƐHO HIA PAA: Ɛboa ma abofra no ti ne akyi nnompe nyin yie na mogya ntwe wo.",
    details: {
      en: "Standard WHO & GHS routine antenatal supplementation. Take daily with water or citrus fruit juice for best absorption.",
      twi: "Ghana Health Service hyɛ sɛ maame biara nnom da biara de asi mogya a ɛyɛ ketewa ano kwan.",
    },
  },
  amoxicillin: {
    name: "Amoxicillin",
    twi: "Amoxicillin",
    verdict: "safe",
    en: "SAFE under Prescription: Widely used antibiotic in pregnancy.",
    twi: "ÉHO HO wɔ dɔkota ahyɛde mu: Antibiotic a wɔtaa de ma maame a ɔyem.",
    details: {
      en: "Penicillin-class antibiotics are safe during pregnancy for bacterial infections when prescribed by a qualified clinician. Complete full prescribed course.",
      twi: "Sɛ dɔkota na ɔkyerɛw maa wo a, ɛyɛ ma nyinsɛn. Nom nyinaa wie sɛnea wɔkyerɛe no.",
    },
  },
  artemether: {
    name: "Artemether-Lumefantrine (Coartem)",
    twi: "Coartem (Artemether)",
    verdict: "safe",
    en: "SAFE in 2nd & 3rd Trimesters (WHO Guidelines for Malaria).",
    twi: "ÉHO HO wɔ Abosome 4 kɔsi 9 mu ma Asoma/Tiridii.",
    details: {
      en: "First-line malaria treatment for pregnant women in second and third trimesters. In the first trimester, consult your doctor or midwife for specific GHS protocols.",
      twi: "Aduro titiriw a GHS de sa asoma wɔ nyinsɛn mfitiase akyi. Bisa wo nɛɛse anaa dɔkota ntɛm.",
    },
  },
  ibuprofen: {
    name: "Ibuprofen / NSAIDs",
    twi: "Ibuprofen (NSAID Nnuro)",
    verdict: "danger",
    en: "DANGER / AVOID: Especially after week 20 and in 3rd trimester.",
    twi: "ƆHAW / KWATI: Ɛnyɛ ma nyinsɛn, titiriw abosome 5 kɔsi awoɔ.",
    details: {
      en: "Can cause low amniotic fluid, premature closure of fetal ductus arteriosus, and kidney complications for the baby. Use Paracetamol instead.",
      twi: "Ebetumi atew abofra no nsuo a ɔte mu no so na asɛe ne koma ne asaabo kwan. Fa Paracetamol mmom.",
    },
  },
  aspirin: {
    name: "Aspirin (High-Dose OTC)",
    twi: "Aspirin",
    verdict: "caution",
    en: "CAUTION: Avoid high-dose OTC use; only take low-dose if prescribed for preeclampsia prevention.",
    twi: "ÈKA: Mfa wo pɛ nnom; gye sɛ dɔkota ahyɛ ma mogya mmoroso ho.",
    details: {
      en: "High-dose aspirin increases bleeding risks. Low-dose (75-150mg) is only used under direct obstetric supervision to prevent pre-eclampsia.",
      twi: "Aspirin dodoɔ ma mogya pue dodo. Dɔkota nkutoo na obetumi ahyɛ dose ketewa a ɛbɔ wo ho ban.",
    },
  },
  metronidazole: {
    name: "Metronidazole (Flagyl)",
    twi: "Metronidazole (Flagyl)",
    verdict: "caution",
    en: "CAUTION: Avoid in 1st trimester unless explicitly directed by a doctor.",
    twi: "ÈKA: Kwati wɔ abosome 3 a edi kan no mu gye sɛ dɔkota na ɔhyɛe.",
    details: {
      en: "Avoid during the first trimester due to organogenesis. May be used in later pregnancy under clinical guidance for specific infections.",
      twi: "Wɔkwati wɔ mfitiase pɛɛ. Akyiri no dɔkota betumi ama wo sɛ ehia ma yadeɛ bi a.",
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
    label: "🟡 CAUTION / USE WITH CARE",
    bg: "bg-earthen-ochre/10 border-earthen-ochre/40",
    text: "text-earthen-ochre",
  },
  danger: {
    label: "🔴 AVOID / DANGER",
    bg: "bg-error-container border-error/50",
    text: "text-error",
  },
};

function normalizeKey(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function matchEntry(input, database) {
  const norm = normalizeKey(input);
  if (!norm) return null;

  // Exact key match
  if (database[norm]) return database[norm];

  // Partial match by key or name
  for (const [k, data] of Object.entries(database)) {
    if (norm.includes(k) || k.includes(norm)) return data;
    if (data.name.toLowerCase().includes(input.toLowerCase().trim())) return data;
    if (data.twi && data.twi.toLowerCase().includes(input.toLowerCase().trim())) return data;
  }
  return null;
}

export default function Safety() {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState("food"); // "food" | "drug"

  const [foodQuery, setFoodQuery] = useState("");
  const [foodResult, setFoodResult] = useState(null);
  const [foodChecked, setFoodChecked] = useState(false);
  const [foodRecents, setFoodRecents] = useState(() => getRecents("food_safety"));

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResult, setDrugResult] = useState(null);
  const [drugChecked, setDrugChecked] = useState(false);
  const [drugRecents, setDrugRecents] = useState(() => getRecents("drug_safety"));

  const handleCheckFood = (queryToUse) => {
    const q = (typeof queryToUse === "string" ? queryToUse : foodQuery).trim();
    if (!q) return;
    setFoodQuery(q);
    addRecent("food_safety", q);
    setFoodRecents(getRecents("food_safety"));
    const match = matchEntry(q, FOOD_HERB_DATA);
    setFoodResult(match);
    setFoodChecked(true);
  };

  const handleCheckDrug = (queryToUse) => {
    const q = (typeof queryToUse === "string" ? queryToUse : drugQuery).trim();
    if (!q) return;
    setDrugQuery(q);
    addRecent("drug_safety", q);
    setDrugRecents(getRecents("drug_safety"));
    const match = matchEntry(q, DRUG_DATA);
    setDrugResult(match);
    setDrugChecked(true);
  };

  const resetFood = () => {
    setFoodQuery("");
    setFoodResult(null);
    setFoodChecked(false);
  };

  const resetDrug = () => {
    setDrugQuery("");
    setDrugResult(null);
    setDrugChecked(false);
  };

  const foodVerdictConfig = foodResult ? VERDICT_CONFIG[foodResult.verdict] : null;
  const drugVerdictConfig = drugResult ? VERDICT_CONFIG[drugResult.verdict] : null;

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto pb-24">
      <h1 className="font-headline text-headline-md text-on-background mb-1">
        {lang === "twi" ? "Aduane & Nnuro Banbɔ" : "Herbal & Medication Safety"}
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm">
        {lang === "twi"
          ? "Hwɛ sɛ afifide, aduane anaa aduro bi yɛ ma nyinsɛn ne awoɔ akyi"
          : "Check whether a local herb, food, or medication is safe during pregnancy & breastfeeding"}
      </p>

      {/* Tab Switcher */}
      <div className="flex bg-surface-container rounded-2xl p-1 mb-6 border border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveTab("food")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "food"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">spa</span>
          <span>{lang === "twi" ? "Afifide & Aduane" : "Herbs & Food"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("drug")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "drug"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">medication</span>
          <span>{lang === "twi" ? "Nnuro Ahorow" : "Medications"}</span>
        </button>
      </div>

      {/* ═══ TAB 1: FOOD & HERBAL SAFETY ═══ */}
      {activeTab === "food" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-md text-on-surface mb-2 font-semibold text-xs">
              {lang === "twi" ? "Hwehwɛ Afifide anaa Aduane Din" : "Enter Herb or Food Name"}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              <input
                list="food-suggestions"
                type="text"
                value={foodQuery}
                onChange={(e) => {
                  setFoodQuery(e.target.value);
                  setFoodChecked(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCheckFood();
                  }
                }}
                placeholder={lang === "twi" ? "e.g. Moringa, Taabea, Bɔfrɛ bun, Prɛkɛsɛ, Sobolo..." : "e.g. Moringa, Ginger, Taabea, Papaya, Prekese, Neem..."}
                className="w-full h-14 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
              />
              <datalist id="food-suggestions">
                {Object.values(FOOD_HERB_DATA).map((item) => (
                  <option key={item.name} value={item.name} />
                ))}
              </datalist>
            </div>

            {/* Recents */}
            {foodRecents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                <span className="text-[11px] text-on-surface-variant font-medium mr-1">
                  {lang === "twi" ? "Nnansa yi:" : "Recent:"}
                </span>
                {foodRecents.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleCheckFood(item)}
                    className="text-xs px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!foodChecked && (
            <button
              onClick={() => handleCheckFood()}
              disabled={!foodQuery.trim()}
              className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>{lang === "twi" ? "Hwɛ Banbɔ Asɛm" : "Check Food Safety"}</span>
            </button>
          )}

          {/* Result Card */}
          {foodChecked && (
            <div className="flex flex-col gap-3 mt-1">
              {foodResult ? (
                <div className={`rounded-2xl border p-5 ${foodVerdictConfig.bg}`}>
                  <p className={`font-headline text-headline-md mb-2 ${foodVerdictConfig.text}`}>
                    {foodVerdictConfig.label}
                  </p>
                  <h2 className="font-semibold text-on-surface text-base mb-1">
                    {lang === "twi" ? foodResult.twi : foodResult.name}
                  </h2>
                  <p className={`font-semibold text-sm mb-3 ${foodVerdictConfig.text}`}>
                    {lang === "twi" ? foodResult.twi : foodResult.en}
                  </p>
                  <div className="border-t border-current/20 pt-3 mt-2">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                      {lang === "twi" ? "Apomuden Nkyerɛkyerɛmu" : "Clinical & Cultural Guidance"}
                    </p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {lang === "twi" ? foodResult.details.twi : foodResult.details.en}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-center">
                  <span className="material-symbols-outlined text-[32px] text-outline mb-2 block">info</span>
                  <p className="font-semibold text-on-surface text-sm mb-1">
                    {lang === "twi" ? "Nsɛm nni ho koraa" : `No safety data recorded for "${foodQuery}"`}
                  </p>
                  <p className="text-on-surface-variant text-xs leading-relaxed max-w-sm mx-auto">
                    {lang === "twi"
                      ? "Sɛ wonnye nni a, mfa mma wo ho bere a woyem. Bisa wo nɛɛse anaa dɔkota ansa."
                      : "When in doubt during pregnancy, avoid concentrated herbal preparations and consult your midwife or healthcare provider."}
                  </p>
                </div>
              )}

              <button
                onClick={resetFood}
                className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-full text-sm hover:bg-surface-container-low transition-colors"
              >
                {lang === "twi" ? "Hwehwɛ afifide foforo" : "Check another herb or food"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: DRUG / MEDICATION SAFETY ═══ */}
      {activeTab === "drug" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-md text-on-surface mb-2 font-semibold text-xs">
              {lang === "twi" ? "Hwehwɛ Aduro Din" : "Enter Medication Name"}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              <input
                list="drug-suggestions"
                type="text"
                value={drugQuery}
                onChange={(e) => {
                  setDrugQuery(e.target.value);
                  setDrugChecked(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCheckDrug();
                  }
                }}
                placeholder={lang === "twi" ? "e.g. Paracetamol, Coartem, Ibuprofen, Iron, Amoxicillin..." : "e.g. Paracetamol, Coartem, Ibuprofen, Iron & Folic Acid, Aspirin..."}
                className="w-full h-14 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
              />
              <datalist id="drug-suggestions">
                {Object.values(DRUG_DATA).map((item) => (
                  <option key={item.name} value={item.name} />
                ))}
              </datalist>
            </div>

            {/* Recents */}
            {drugRecents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                <span className="text-[11px] text-on-surface-variant font-medium mr-1">
                  {lang === "twi" ? "Nnansa yi:" : "Recent:"}
                </span>
                {drugRecents.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleCheckDrug(item)}
                    className="text-xs px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!drugChecked && (
            <button
              onClick={() => handleCheckDrug()}
              disabled={!drugQuery.trim()}
              className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === "twi" ? "Hwɛ Aduro Banbɔ" : "Check Drug Safety"}</span>
            </button>
          )}

          {/* Result Card */}
          {drugChecked && (
            <div className="flex flex-col gap-3 mt-1">
              {drugResult ? (
                <div className={`rounded-2xl border p-5 ${drugVerdictConfig.bg}`}>
                  <p className={`font-headline text-headline-md mb-2 ${drugVerdictConfig.text}`}>
                    {drugVerdictConfig.label}
                  </p>
                  <h2 className="font-semibold text-on-surface text-base mb-1">
                    {drugResult.name}
                  </h2>
                  <p className={`font-semibold text-sm mb-3 ${drugVerdictConfig.text}`}>
                    {lang === "twi" ? drugResult.twi : drugResult.en}
                  </p>
                  <div className="border-t border-current/20 pt-3 mt-2">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                      {lang === "twi" ? "Dɔkota Afotu" : "Clinical Recommendation"}
                    </p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {lang === "twi" ? drugResult.details.twi : drugResult.details.en}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-center">
                  <span className="material-symbols-outlined text-[32px] text-outline mb-2 block">info</span>
                  <p className="font-semibold text-on-surface text-sm mb-1">
                    {lang === "twi" ? "Nsɛm nni ho koraa" : `No safety data recorded for "${drugQuery}"`}
                  </p>
                  <p className="text-on-surface-variant text-xs leading-relaxed max-w-sm mx-auto">
                    {lang === "twi"
                      ? "Mfa aduro biara a dɔkota anaa nɛɛse nhyɛe bere a woyem no mma wo ho."
                      : "Never start or stop prescription medications without consulting your healthcare provider or pharmacist."}
                  </p>
                </div>
              )}

              <button
                onClick={resetDrug}
                className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-full text-sm hover:bg-surface-container-low transition-colors"
              >
                {lang === "twi" ? "Hwehwɛ aduro foforo" : "Check another medication"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}