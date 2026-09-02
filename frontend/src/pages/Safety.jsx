import { useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { api, getRecents, addRecent } from "../services/api.js";
import { playNeuralSpeech, stopNeuralSpeech } from "../services/speech.js";
import {
  Search, ShieldCheck, AlertTriangle, CheckCircle, Info,
  Loader2, Volume2, Square, Sparkles, BookOpen, Leaf, RefreshCw, Plus, Clock
} from "lucide-react";

// ── Dialect Synonym Lookup Map for instant client-side matching ────────────────
const LOCAL_NAME_MAP = {
  "nkruma": "okro",
  "okra": "okro",
  "fetri": "okro",
  "lady's fingers": "okro",
  "kontomire": "cocoyam leaves",
  "abunabun": "cocoyam leaves",
  "kpakpo shito": "scotch bonnet pepper",
  "bofre": "pawpaw",
  "bofrɛ": "pawpaw",
  "papaya": "pawpaw",
  "hausa koko": "fermented millet porridge",
  "koko": "fermented millet porridge",
  "prekese": "tetrapleura tetraptera",
  "prɛkɛsɛ": "tetrapleura tetraptera",
  "sobolo": "hibiscus tea",
  "zobo": "hibiscus tea",
  "taabea": "taabea herbal mixture",
  "akekaduro": "ginger",
  "moringa": "moringa leaves",
  "neem": "neem leaves",
};

// Client-side fallback dictionary for offline instant rendering
const OFFLINE_FALLBACK_DATA = {
  okro: {
    name: "Okro (Okra)",
    scientificName: "Abelmoschus esculentus",
    localNames: ["Nkruma", "Lady's Fingers", "Fetri"],
    safetyStatus: "SAFE",
    pregnancySafety: "Safe for regular culinary consumption throughout pregnancy.",
    breastfeedingSafety: "Safe and commonly consumed during lactation.",
    trimesterConsiderations: "Beneficial across all trimesters.",
    clinicalSummary: "Rich in dietary folate (crucial for neural tube defect prevention), soluble fiber, and vitamin C. Culinary consumption supports healthy blood sugar regulation and digestion.",
    keyRisksOrBenefits: [
      "High natural folate content for fetal development",
      "Helps prevent gestational constipation",
      "Supports healthy maternal blood sugar regulation"
    ],
    twiSummary: "ÉHO HO: Nkruma yɛ aduane pa paa wɔ nyinsɛn mu. Ɛwɔ folate ne fiber a ɛboa obaa ne ne ba apomuden."
  },
  "cocoyam leaves": {
    name: "Kontomire (Cocoyam Leaves)",
    scientificName: "Xanthosoma sagittifolium",
    localNames: ["Kontomire", "Abunabun", "Taro Leaves"],
    safetyStatus: "SAFE",
    pregnancySafety: "Safe when thoroughly cooked. Excellent source of plant-based iron.",
    breastfeedingSafety: "Safe and highly recommended during lactation.",
    trimesterConsiderations: "Safe in all trimesters when well cooked.",
    clinicalSummary: "Packed with iron, folate, and vitamin A. Essential for preventing maternal anaemia in Ghana. Always ensure leaves are completely cooked to destroy calcium oxalate crystals.",
    keyRisksOrBenefits: [
      "Rich source of dietary iron to prevent anaemia",
      "High in vitamins A, C, and B9 (folate)",
      "Must be thoroughly cooked before eating"
    ],
    twiSummary: "ÉHO HO: Kontomire a wɔanoa no yie yɛ pa ma mogya kɔ anim na ɛsi mogya ketewa ano kwan."
  },
  ginger: {
    name: "Ginger (Akekaduro)",
    scientificName: "Zingiber officinale",
    localNames: ["Akekaduro", "Ginger"],
    safetyStatus: "SAFE",
    pregnancySafety: "Safe in culinary amounts. Proven effective for morning sickness.",
    breastfeedingSafety: "Safe in normal food quantities.",
    trimesterConsiderations: "Particularly beneficial in 1st trimester for nausea.",
    clinicalSummary: "Culinary amounts in tea or food are safe and clinically recommended for morning sickness. Avoid high-dose concentrated herbal extracts.",
    keyRisksOrBenefits: [
      "Relieves 1st-trimester nausea and vomiting",
      "Aids digestion and eases bloating",
      "Avoid raw high-dose supplement capsules"
    ],
    twiSummary: "ÉHO HO: Akekaduro kakra wɔ tii anaa aduane mu boa ma feefe ne yafunu teetee kɔ fam."
  },
  "tetrapleura tetraptera": {
    name: "Prekese (Aidan Fruit)",
    scientificName: "Tetrapleura tetraptera",
    localNames: ["Prɛkɛsɛ", "Prekese", "Aidan Fruit"],
    safetyStatus: "CAUTION",
    pregnancySafety: "Use sparingly as soup seasoning. Avoid concentrated boiled infusions.",
    breastfeedingSafety: "Safe in light culinary soup quantities.",
    trimesterConsiderations: "Exercise caution in 1st trimester; avoid concentrated brews.",
    clinicalSummary: "Small culinary amounts as soup flavouring are generally tolerated. However, concentrated boiling or high consumption can stimulate uterine muscle contractions.",
    keyRisksOrBenefits: [
      "Safe as mild culinary soup spice",
      "Contains anti-inflammatory antioxidants",
      "Avoid concentrated medicinal decoctions"
    ],
    twiSummary: "ÈKA: Fa kakra bi gu nkwan mu ma hua yɛ kwayɛ. Kwati nsuo denden a wɔanoa sɛ aduro."
  },
  "hibiscus tea": {
    name: "Sobolo (Hibiscus Tea)",
    scientificName: "Hibiscus sabdariffa",
    localNames: ["Sobolo", "Zobo", "Roselle"],
    safetyStatus: "CAUTION",
    pregnancySafety: "Limit intake during pregnancy due to potential uterine stimulation.",
    breastfeedingSafety: "Occasional light consumption is acceptable.",
    trimesterConsiderations: "Avoid heavy consumption in 1st trimester.",
    clinicalSummary: "Hibiscus contains phytoestrogens that can stimulate menstruation or uterine blood flow in large quantities. Occasional light sips are fine, but heavy daily drinking should be avoided.",
    keyRisksOrBenefits: [
      "High in vitamin C and antioxidants",
      "May stimulate uterine blood flow in high doses",
      "Limit to occasional light drinking"
    ],
    twiSummary: "ÈKA: Sobolo a ano yɛ den betumi akanyan mogya kwan wɔ yafunu mu. Kwati nom pii da biara."
  },
  "taabea herbal mixture": {
    name: "Taabea Herbal Mixture",
    scientificName: "Polyherbal Formulation",
    localNames: ["Taabea Aduro"],
    safetyStatus: "AVOID",
    pregnancySafety: "Not recommended during pregnancy.",
    breastfeedingSafety: "Avoid during lactation.",
    trimesterConsiderations: "Strictly avoid across all trimesters.",
    clinicalSummary: "Safety and dosage in pregnancy are unproven. Polyherbal mixtures strongly induce liver metabolic enzymes, which can alter vital drug and nutrient levels.",
    keyRisksOrBenefits: [
      "Unverified safety profile in pregnancy",
      "May interact with prescribed antenatal supplements",
      "Consult midwife before taking any herbal tonic"
    ],
    twiSummary: "ƆHAW / KWATI: Ɛnyɛ pa ma obaa a ɔyem. Ebetumi asɛe nnuro pa a worenom no adwuma."
  },
  "neem leaves": {
    name: "Neem Leaves (Neem Nhahan)",
    scientificName: "Azadirachta indica",
    localNames: ["Neem", "Donkonyi"],
    safetyStatus: "AVOID",
    pregnancySafety: "Strictly avoid. Documented uterine stimulant and abortifacient.",
    breastfeedingSafety: "Avoid concentrated neem extracts during lactation.",
    trimesterConsiderations: "Avoid in all trimesters.",
    clinicalSummary: "Neem extracts have documented abortifacient and uterine-stimulating properties in clinical literature. Strictly avoid oral intake during pregnancy.",
    keyRisksOrBenefits: [
      "Can trigger uterine contractions",
      "Documented risk of pregnancy loss",
      "Avoid all oral decoctions and teas"
    ],
    twiSummary: "ƆHAW / KWATI: Neem nhahan wɔ ahoɔden a etumi tew nyinsɛn gu. Kwati nom koraa."
  },
  "pawpaw": {
    name: "Unripe Pawpaw (Green Papaya)",
    scientificName: "Carica papaya",
    localNames: ["Bɔfrɛ bun", "Unripe Papaya"],
    safetyStatus: "AVOID",
    pregnancySafety: "Avoid unripe or semi-ripe green papaya. Fully ripe papaya is safe.",
    breastfeedingSafety: "Ripe papaya is safe and galactagogue during breastfeeding.",
    trimesterConsiderations: "Strictly avoid green/unripe papaya in 1st & 2nd trimesters.",
    clinicalSummary: "Unripe green papaya contains concentrated latex and papain which act like oxytocin and prostaglandin, triggering uterine spasms. Fully ripe sweet orange papaya is safe and nutritious.",
    keyRisksOrBenefits: [
      "Green latex can trigger uterine spasms",
      "Fully ripe orange papaya is safe and rich in vitamin C",
      "Avoid raw green papaya salads or extracts"
    ],
    twiSummary: "ƆHAW / KWATI: Bɔfrɛ bun mu nsuo betumi ama yafunu atwetwe ntɛm. Ripe bɔfrɛ kɔkɔɔ no mmom yɛ safe."
  },
  paracetamol: {
    name: "Paracetamol (Acetaminophen)",
    scientificName: "N-acetyl-p-aminophenol",
    localNames: ["Paracetamol", "Panadol"],
    safetyStatus: "SAFE",
    pregnancySafety: "SAFE first-line choice for pain and fever relief in pregnancy.",
    breastfeedingSafety: "Safe during breastfeeding at standard doses.",
    trimesterConsiderations: "Safe in all trimesters at recommended dosage.",
    clinicalSummary: "Generally considered the safest analgesic and fever-reducer across all trimesters when taken at standard dosages (500mg-1000mg as needed, max 4g/day).",
    keyRisksOrBenefits: [
      "First-line recommended pain relief",
      "Safe for baby when taken at normal doses",
      "Avoid exceeding recommended maximum daily dose"
    ],
    twiSummary: "ÉHO HO: Aduro pa a ɛyɛ ma tiyaw, hye ne nipadua yaw wɔ nyinsɛn bere mu."
  },
  "artemether-lumefantrine": {
    name: "Artemether-Lumefantrine (Coartem)",
    scientificName: "Artemether / Lumefantrine",
    localNames: ["Coartem", "Artemether"],
    safetyStatus: "SAFE",
    pregnancySafety: "SAFE in 2nd and 3rd trimesters (WHO Guidelines for Malaria).",
    breastfeedingSafety: "Safe during lactation under medical advice.",
    trimesterConsiderations: "First-line choice for 2nd & 3rd trimesters. Consult midwife in 1st trimester.",
    clinicalSummary: "Standard WHO & GHS first-line treatment for uncomplicated malaria in pregnant women in second and third trimesters. Prompt treatment of malaria protects mother and baby.",
    keyRisksOrBenefits: [
      "WHO first-line malaria treatment for 2nd/3rd trimester",
      "Protects against malaria-induced anaemia and preterm birth",
      "Must be taken under healthcare provider prescription"
    ],
    twiSummary: "ÉHO HO: GHS hyɛ sɛ wɔde sa asoma/tiridii wɔ nyinsɛn abosome 4 kɔsi 9 mu."
  },
  ibuprofen: {
    name: "Ibuprofen (NSAID)",
    scientificName: "Ibuprofen",
    localNames: ["Ibuprofen", "Advil", "Nurofen"],
    safetyStatus: "AVOID",
    pregnancySafety: "AVOID, especially after 20 weeks and in 3rd trimester.",
    breastfeedingSafety: "Short-term use is acceptable during breastfeeding.",
    trimesterConsiderations: "Strictly avoid after 20 weeks gestational age.",
    clinicalSummary: "NSAIDs can cause premature closure of the fetal ductus arteriosus, low amniotic fluid levels (oligohydramnios), and fetal renal dysfunction. Use Paracetamol instead.",
    keyRisksOrBenefits: [
      "Risk of fetal heart and kidney complications",
      "Can cause dangerously low amniotic fluid levels",
      "Use Paracetamol as safe alternative"
    ],
    twiSummary: "ƆHAW / KWATI: Ibuprofen betumi asɛe abofra no koma ne nsuo a ɔte mu. Nom Paracetamol mmom."
  }
};

const STATUS_BADGES = {
  SAFE: {
    label: "🟢 SAFE",
    bg: "bg-forest-green/10 border-forest-green/40 text-forest-green",
    badgeBg: "bg-forest-green text-white",
  },
  CAUTION: {
    label: "🟡 CAUTION / USE WITH CARE",
    bg: "bg-earthen-ochre/10 border-earthen-ochre/40 text-earthen-ochre",
    badgeBg: "bg-earthen-ochre text-white",
  },
  AVOID: {
    label: "🔴 AVOID / DANGER",
    bg: "bg-error-container border-error/50 text-error",
    badgeBg: "bg-error text-white",
  },
  UNKNOWN: {
    label: "⚪ CAUTION / UNVERIFIED",
    bg: "bg-surface-container border-outline-variant text-on-surface-variant",
    badgeBg: "bg-outline text-white",
  }
};

const COMBO_STATUS_BADGES = {
  SAFE: {
    bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
    badgeBg: "bg-emerald-600 text-white",
    label: "Safe Together",
  },
  CAUTION: {
    bg: "bg-amber-50 border-amber-200 text-amber-800",
    badgeBg: "bg-amber-600 text-white",
    label: "Use Caution / Space Out (2 Hrs)",
  },
  AVOID: {
    bg: "bg-rose-50 border-rose-200 text-rose-800",
    badgeBg: "bg-rose-600 text-white",
    label: "Avoid Combination",
  }
};

export default function Safety() {
  const { lang, voiceLang } = useLang();
  const [activeTab, setActiveTab] = useState("food"); // "food" | "drug" | "combinations"

  // Single Item Search state
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardResult, setCardResult] = useState(null);
  const [checked, setChecked] = useState(false);
  const [recents, setRecents] = useState(() => getRecents("safety_queries"));
  const [speaking, setSpeaking] = useState(false);

  // Combination State
  const [comboItem1, setComboItem1] = useState("");
  const [comboItem2, setComboItem2] = useState("");
  const [comboLoading, setComboLoading] = useState(false);
  const [comboResult, setComboResult] = useState(null);
  const [comboChecked, setComboChecked] = useState(false);

  const quickCombos = [
    { a: "Iron tablets", b: "Sobolo (Hibiscus tea)" },
    { a: "Kontomire", b: "Folic Acid" },
    { a: "Prekese", b: "Blood pressure medication" },
    { a: "Paracetamol", b: "Amoxicillin" },
    { a: "Taabea", b: "Iron Pills" }
  ];

  const handleEvaluateSingle = async (queryToUse) => {
    const q = (typeof queryToUse === "string" ? queryToUse : query).trim();
    if (!q) return;

    setQuery(q);
    addRecent("safety_queries", q);
    setRecents(getRecents("safety_queries"));
    setLoading(true);
    setChecked(true);
    stopNeuralSpeech();
    setSpeaking(false);

    const normKey = (LOCAL_NAME_MAP[q.toLowerCase()] || q.toLowerCase()).trim();

    try {
      const res = await api.evaluateHerbSafety({ query: q });

      if (res && res.success && res.data) {
        setCardResult(res.data);
      } else {
        const fallback = OFFLINE_FALLBACK_DATA[normKey] || OFFLINE_FALLBACK_DATA[q.toLowerCase()];
        if (fallback) {
          setCardResult(fallback);
        } else {
          setCardResult({
            name: q.charAt(0).toUpperCase() + q.slice(1),
            scientificName: "Botanical / Clinical Evaluation",
            localNames: [q],
            safetyStatus: "CAUTION",
            pregnancySafety: "Exercise caution during pregnancy.",
            breastfeedingSafety: "Use with care during lactation.",
            trimesterConsiderations: "Consult your midwife or doctor.",
            clinicalSummary: `No conclusive safety record found for "${q}". Avoid concentrated preparations during pregnancy and consult your healthcare provider.`,
            keyRisksOrBenefits: ["Avoid raw concentrated extracts", "Consult midwife or physician"],
            twiSummary: "Sɛ wonnye nni a, mfa mma wo ho bere a woyem. Bisa wo dɔkota ansa."
          });
        }
      }
    } catch (err) {
      console.warn('[Safety] Single evaluation notice:', err);
      const fallback = OFFLINE_FALLBACK_DATA[normKey] || OFFLINE_FALLBACK_DATA[q.toLowerCase()];
      if (fallback) setCardResult(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateCombo = async (item1Input, item2Input) => {
    const i1 = (typeof item1Input === "string" ? item1Input : comboItem1).trim();
    const i2 = (typeof item2Input === "string" ? item2Input : comboItem2).trim();
    if (!i1 || !i2) return;

    setComboItem1(i1);
    setComboItem2(i2);
    setComboLoading(true);
    setComboChecked(true);
    setComboResult(null);
    stopNeuralSpeech();
    setSpeaking(false);

    try {
      const res = await api.checkCombinationSafety({ item1: i1, item2: i2 });
      if (res && res.success && res.data) {
        setComboResult(res.data);
      } else {
        setComboResult({
          item1: i1,
          item2: i2,
          status: "CAUTION",
          summary: `Always space herbal teas and prescribed medicines apart by 2 hours during pregnancy.`,
          timingRecommendation: `Space out intake of ${i1} and ${i2} by at least 2 hours.`,
          riskOrMechanism: `Potential absorption overlap or mild gastric interaction.`,
          twiSummary: `ÈKA: Gye nnɔnhwerew 2 ntam bere a worenom aduro ne herbal tii.`
        });
      }
    } catch (err) {
      console.warn('[Safety] Combination evaluation notice:', err);
      setComboResult({
        item1: i1,
        item2: i2,
        status: "CAUTION",
        summary: `Exercise caution when combining ${i1} and ${i2} during pregnancy.`,
        timingRecommendation: `Space out intake by at least 2 hours.`,
        riskOrMechanism: `Potential absorption overlap or mild gastric interaction.`,
        twiSummary: `ÈKA: Gye nnɔnhwerew 2 ntam bere a worenom aduro ne herbal tii.`
      });
    } finally {
      setComboLoading(false);
    }
  };

  const handleToggleSpeak = (card) => {
    if (speaking) {
      stopNeuralSpeech();
      setSpeaking(false);
      return;
    }

    const textToSpeak = activeTab === "combinations"
      ? (card.twiSummary || `${card.item1} and ${card.item2}. Status: ${card.status}. ${card.summary} Recommendation: ${card.timingRecommendation}`)
      : (card.twiSummary || `${card.name}. Safety Status: ${card.safetyStatus}. ${card.pregnancySafety} ${card.clinicalSummary}`);

    setSpeaking(true);
    playNeuralSpeech(
      textToSpeak,
      voiceLang,
      () => setSpeaking(true),
      () => setSpeaking(false),
      () => setSpeaking(false)
    );
  };

  const resetSearch = () => {
    setQuery("");
    setCardResult(null);
    setChecked(false);
    setComboItem1("");
    setComboItem2("");
    setComboResult(null);
    setComboChecked(false);
    stopNeuralSpeech();
    setSpeaking(false);
  };

  const statusConfig = cardResult ? (STATUS_BADGES[cardResult.safetyStatus] || STATUS_BADGES.CAUTION) : null;
  const comboStatusConfig = comboResult ? (COMBO_STATUS_BADGES[comboResult.status] || COMBO_STATUS_BADGES.CAUTION) : null;

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto pb-24">
      {/* Header Title */}
      <h1 className="font-headline text-headline-md text-on-background mb-1 flex items-center gap-2">
        <span>{lang === "twi" ? "Aduane & Nnuro Banbɔ" : "Herbal & Medication Safety"}</span>
        <Sparkles className="w-5 h-5 text-primary" />
      </h1>
      <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">
        {lang === "twi"
          ? "Hwehwɛ afifide, aduane, nnuro anaa afifide ne aduro nkitahodi mu ma yɛn-AI pipeline nhwehwɛ mu mma wo ntɛm."
          : "Check any local herb, plant, food, medication, or item pair combination for clinical maternal safety evaluation."}
      </p>

      {/* 3-Tab Switcher (Herbs | Meds | Combinations) */}
      <div className="grid grid-cols-3 gap-1.5 bg-surface-container rounded-2xl p-1 mb-6 border border-outline-variant text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setActiveTab("food"); resetSearch(); }}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "food"
              ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Leaf className="w-4 h-4 text-forest-green" />
          <span>{lang === "twi" ? "Afifide" : "Herbs & Food"}</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("drug"); resetSearch(); }}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "drug"
              ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{lang === "twi" ? "Nnuro" : "Medications"}</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("combinations"); resetSearch(); }}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "combinations"
              ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <RefreshCw className="w-4 h-4 text-secondary" />
          <span>{lang === "twi" ? "Nkitahodi" : "Combinations"}</span>
        </button>
      </div>

      {/* ═══ TABS 1 & 2: SINGLE HERB / FOOD / DRUG SEARCH ═══ */}
      {(activeTab === "food" || activeTab === "drug") && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-md text-on-surface mb-2 font-semibold text-xs">
              {activeTab === "food"
                ? (lang === "twi" ? "Hwehwɛ Afifide, Ndua, anaa Aduane Din" : "Enter Herb, Plant, or Food Name")
                : (lang === "twi" ? "Hwehwɛ Aduro Din" : "Enter Medication Name")}
            </label>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              <input
                list="safety-suggestions"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setChecked(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEvaluateSingle();
                  }
                }}
                placeholder={
                  activeTab === "food"
                    ? (lang === "twi" ? "e.g. Okro, Nkruma, Kontomire, Sobolo, Prekese, Bɔfrɛ bun..." : "e.g. Okro, Nkruma, Kontomire, Sobolo, Prekese, Papaya...")
                    : (lang === "twi" ? "e.g. Paracetamol, Coartem, Ibuprofen, Iron & Folic Acid..." : "e.g. Paracetamol, Coartem, Ibuprofen, Iron & Folic Acid...")
                }
                className="w-full h-14 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
              />
              <datalist id="safety-suggestions">
                {activeTab === "food" ? (
                  <>
                    <option value="Okro (Nkruma)" />
                    <option value="Kontomire (Cocoyam Leaves)" />
                    <option value="Ginger (Akekaduro)" />
                    <option value="Prekese (Aidan Fruit)" />
                    <option value="Sobolo (Hibiscus Tea)" />
                    <option value="Moringa Leaves" />
                    <option value="Unripe Pawpaw (Green Papaya)" />
                    <option value="Neem Leaves" />
                    <option value="Taabea Herbal Mixture" />
                  </>
                ) : (
                  <>
                    <option value="Paracetamol" />
                    <option value="Coartem (Artemether)" />
                    <option value="Iron & Folic Acid" />
                    <option value="Amoxicillin" />
                    <option value="Ibuprofen" />
                    <option value="Metronidazole (Flagyl)" />
                  </>
                )}
              </datalist>
            </div>

            {/* Recents */}
            {recents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                <span className="text-[11px] text-on-surface-variant font-medium mr-1">
                  {lang === "twi" ? "Nnansa yi:" : "Recent:"}
                </span>
                {recents.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleEvaluateSingle(item)}
                    className="text-xs px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Check Button */}
          {!checked && (
            <button
              onClick={() => handleEvaluateSingle()}
              disabled={!query.trim() || loading}
              className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>
                {lang === "twi" ? "Hwɛ Clinical Safety Database" : "Evaluate Safety with AI Pipeline"}
              </span>
            </button>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 flex flex-col gap-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary shrink-0" />
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    {lang === "twi" ? "Yɛrehwehwɛ Clinical Safety Pipeline mu..." : `Evaluating "${query}" via Clinical AI Pipeline...`}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {lang === "twi" ? "Synthesizing evidence-based obstetrics guidance" : "Normalizing local names & running obstetrics safety schema"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-3/4 bg-surface-container rounded-lg" />
              <div className="h-4 w-full bg-surface-container rounded" />
              <div className="h-20 w-full bg-surface-container rounded-2xl mt-2" />
            </div>
          )}

          {/* Dynamic Evaluation Single Result Safety Card */}
          {checked && !loading && cardResult && (
            <div className="flex flex-col gap-4 mt-1 animate-scale-in">
              <div className={`rounded-3xl border p-5 md:p-6 shadow-md transition-all ${statusConfig.bg}`}>
                <div className="flex items-start justify-between gap-2 mb-3 border-b border-current/15 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusConfig.badgeBg}`}>
                        {cardResult.safetyStatus}
                      </span>
                      {cardResult.scientificName && (
                        <span className="text-xs italic text-on-surface-variant opacity-80">
                          {cardResult.scientificName}
                        </span>
                      )}
                    </div>
                    <h2 className="font-headline font-bold text-xl text-on-surface">
                      {cardResult.name}
                    </h2>
                  </div>

                  <button
                    onClick={() => handleToggleSpeak(cardResult)}
                    aria-label="Read safety guidance aloud"
                    className={`p-2 rounded-full border transition-all ${
                      speaking
                        ? "bg-primary text-on-primary border-primary animate-pulse"
                        : "bg-surface-container hover:bg-surface-container-high text-primary border-outline-variant"
                    }`}
                  >
                    {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {cardResult.localNames && cardResult.localNames.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      {lang === "twi" ? "Din afoforo:" : "Known Aliases:"}
                    </span>
                    {cardResult.localNames.map((alias) => (
                      <span key={alias} className="px-2 py-0.5 rounded-md bg-surface-container text-xs font-medium text-on-surface-variant border border-outline-variant">
                        {alias}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-surface-container-lowest/80 border border-outline-variant/60 rounded-2xl p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{lang === "twi" ? "Nyinsɛn Banbɔ" : "Pregnancy Safety"}</span>
                    </p>
                    <p className="text-xs text-on-surface font-medium leading-relaxed">
                      {cardResult.pregnancySafety}
                    </p>
                  </div>

                  <div className="bg-surface-container-lowest/80 border border-outline-variant/60 rounded-2xl p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>{lang === "twi" ? "Nufusuo Banbɔ" : "Lactation Safety"}</span>
                    </p>
                    <p className="text-xs text-on-surface font-medium leading-relaxed">
                      {cardResult.breastfeedingSafety}
                    </p>
                  </div>
                </div>

                {cardResult.trimesterConsiderations && (
                  <div className="mb-4 bg-surface-container-lowest/60 rounded-xl p-3 text-xs text-on-surface-variant">
                    <strong className="text-on-surface font-semibold">{lang === "twi" ? "Trimester Afotu: " : "Trimester Notes: "}</strong>
                    <span>{cardResult.trimesterConsiderations}</span>
                  </div>
                )}

                <div className="border-t border-current/15 pt-3 mb-4">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>{lang === "twi" ? "Clinical Summary" : "Evidence-Based Obstetrics Summary"}</span>
                  </p>
                  <p className="text-sm text-on-surface leading-relaxed font-medium">
                    {cardResult.clinicalSummary}
                  </p>
                </div>

                {cardResult.keyRisksOrBenefits && cardResult.keyRisksOrBenefits.length > 0 && (
                  <div className="bg-surface-container-lowest/90 rounded-2xl p-4 border border-outline-variant/60">
                    <p className="text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">
                      {lang === "twi" ? "Akyerɛkyerɛpa & Afotu" : "Key Benefits & Risk Considerations"}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {cardResult.keyRisksOrBenefits.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant">
                          {cardResult.safetyStatus === "SAFE" ? (
                            <CheckCircle className="w-3.5 h-3.5 text-forest-green shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-earthen-ochre shrink-0 mt-0.5" />
                          )}
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cardResult.twiSummary && (
                  <div className="mt-4 pt-3 border-t border-current/15">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
                      🇬🇭 Akan Twi Nkyerɛkyerɛmu:
                    </p>
                    <p className="text-xs text-on-surface-variant italic leading-relaxed">
                      {cardResult.twiSummary}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={resetSearch}
                className="w-full border border-outline-variant text-on-surface-variant py-3.5 rounded-full text-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>{lang === "twi" ? "Hwehwɛ afifide anaa aduro foforo" : "Check another herb, food, or medication"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: COMBINATIONS / INTERACTIONS CHECKER ═══ */}
      {activeTab === "combinations" && (
        <div className="flex flex-col gap-4">
          <form onSubmit={(e) => { e.preventDefault(); handleEvaluateCombo(); }} className="flex flex-col gap-3">
            {/* Item 1 Input */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                {lang === "twi" ? "Nneɛma a Edi Kan (Aduane, Afifide, anaa Aduro)" : "First Item (Food, Herb, or Medicine)"}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={comboItem1}
                  onChange={(e) => { setComboItem1(e.target.value); setComboChecked(false); }}
                  placeholder="e.g. Iron supplement, Sobolo, Kontomire, Prekese"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
                />
              </div>
            </div>

            {/* Combiner Icon */}
            <div className="flex justify-center -my-1">
              <span className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-primary text-xs shadow-xs">
                <Plus className="w-4 h-4" />
              </span>
            </div>

            {/* Item 2 Input */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                {lang === "twi" ? "Nneɛma a Etɔ So Mmienu (Aduane, Afifide, anaa Aduro)" : "Second Item (Food, Herb, or Medicine)"}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={comboItem2}
                  onChange={(e) => { setComboItem2(e.target.value); setComboChecked(false); }}
                  placeholder="e.g. Sobolo, Folic Acid, Blood pressure medication, Paracetamol"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            {!comboChecked && (
              <button
                type="submit"
                disabled={comboLoading || !comboItem1.trim() || !comboItem2.trim()}
                className="w-full py-3.5 bg-primary text-on-primary rounded-2xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${comboLoading ? "animate-spin" : ""}`} />
                <span>
                  {comboLoading
                    ? (lang === "twi" ? "Yɛrehwehwɛ Nkitahodi mu..." : "Analyzing Interaction Safety...")
                    : (lang === "twi" ? "Hwɛ Nkitahodi Banbɔ" : "Check Interaction Safety")}
                </span>
              </button>
            )}
          </form>

          {/* Quick Preset Pairing Chips */}
          <div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              {lang === "twi" ? "Sɔ nneɛma a wɔtaa de fra:" : "Try common pairings:"}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {quickCombos.map((combo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEvaluateCombo(combo.a, combo.b)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span>{combo.a}</span>
                  <span className="text-primary font-bold">+</span>
                  <span>{combo.b}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading Skeleton */}
          {comboLoading && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 flex flex-col gap-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary shrink-0" />
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    {lang === "twi" ? "Yɛrehwehwɛ nkitahodi safety pipeline mu..." : `Evaluating interaction between "${comboItem1}" & "${comboItem2}"...`}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {lang === "twi" ? "Analyzing absorption blocks & maternal safety" : "Checking clinical pharmacology & absorption mechanisms"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-3/4 bg-surface-container rounded-lg" />
              <div className="h-16 w-full bg-surface-container rounded-2xl" />
            </div>
          )}

          {/* Dynamic Combination Safety Card */}
          {comboChecked && !comboLoading && comboResult && (
            <div className="flex flex-col gap-4 mt-1 animate-scale-in">
              <div className={`rounded-3xl border p-5 md:p-6 shadow-md transition-all ${comboStatusConfig.bg}`}>
                {/* Header Title & Badge */}
                <div className="flex items-start justify-between gap-2 mb-3 border-b border-current/15 pb-3">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 ${comboStatusConfig.badgeBg}`}>
                      {comboStatusConfig.label}
                    </span>
                    <h3 className="font-headline font-bold text-lg text-on-surface">
                      {comboResult.item1} & {comboResult.item2}
                    </h3>
                  </div>

                  {/* Read Aloud Button */}
                  <button
                    onClick={() => handleToggleSpeak(comboResult)}
                    aria-label="Read interaction guidance aloud"
                    className={`p-2 rounded-full border transition-all ${
                      speaking
                        ? "bg-primary text-on-primary border-primary animate-pulse"
                        : "bg-surface-container hover:bg-surface-container-high text-primary border-outline-variant"
                    }`}
                  >
                    {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Summary */}
                <p className="text-sm font-medium leading-relaxed mb-4 text-on-surface">
                  {comboResult.summary}
                </p>

                {/* Actionable Timing Recommendation */}
                {comboResult.timingRecommendation && (
                  <div className="bg-surface-container-lowest/90 border border-outline-variant/60 rounded-2xl p-3.5 mb-3 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-0.5">
                        {lang === "twi" ? "Bere Afotu (Timing Advice):" : "Actionable Recommendation:"}
                      </p>
                      <p className="text-xs text-on-surface font-semibold leading-relaxed">
                        {comboResult.timingRecommendation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Clinical Mechanism */}
                {comboResult.riskOrMechanism && (
                  <div className="bg-surface-container-lowest/60 rounded-xl p-3 text-xs text-on-surface-variant mb-3 border-t border-current/10 pt-3">
                    <strong className="text-on-surface font-semibold">
                      {lang === "twi" ? "Ayaresabea Nkyerɛkyerɛmu: " : "Clinical Mechanism: "}
                    </strong>
                    <span>{comboResult.riskOrMechanism}</span>
                  </div>
                )}

                {/* Bilingual Twi Summary */}
                {comboResult.twiSummary && (
                  <div className="pt-3 border-t border-current/15">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
                      🇬🇭 Akan Twi Nkyerɛkyerɛmu:
                    </p>
                    <p className="text-xs text-on-surface-variant italic leading-relaxed">
                      {comboResult.twiSummary}
                    </p>
                  </div>
                )}
              </div>

              {/* Reset Button */}
              <button
                onClick={resetSearch}
                className="w-full border border-outline-variant text-on-surface-variant py-3.5 rounded-full text-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{lang === "twi" ? "Hwehwɛ nkitahodi foforo" : "Check another combination"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}