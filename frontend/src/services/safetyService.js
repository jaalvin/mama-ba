import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ── Dialect & Synonym Map ───────────────────────────────────────────────────
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
  "sobolo": "hibiscus sabdariffa",
  "zobo": "hibiscus sabdariffa",
  "taabea": "taabea herbal mixture",
  "akekaduro": "ginger",
  "moringa": "moringa leaves",
  "neem": "neem leaves",
};

// ── Tier 1: Local Emergency Dataset ─────────────────────────────────────────
const LOCAL_SAFETY_CATALOG = {
  "okro": {
    name: "Okro (Okra)",
    scientificName: "Abelmoschus esculentus",
    localNames: ["Nkruma", "Lady's Fingers", "Fetri"],
    safetyStatus: "SAFE",
    status: "SAFE",
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
    status: "SAFE",
    pregnancySafety: "Safe when thoroughly cooked. Excellent source of plant-based iron.",
    breastfeedingSafety: "Safe and highly recommended during lactation.",
    trimesterConsiderations: "Safe in all trimesters when well cooked.",
    clinicalSummary: "Packed with iron, folate, and vitamin A. Essential for preventing maternal anaemia in Ghana. Always ensure leaves are completely cooked to destroy calcium oxalate crystals.",
    keyRisksOrBenefits: [
      "Rich source of non-heme iron to combat pregnancy anaemia",
      "Contains provitamin A for maternal immune support",
      "Must be boiled thoroughly before eating"
    ],
    twiSummary: "ÉHO HO: Kontomire yɛ aduane a ɛma mogya. Noa no yie paa ansa na wadi."
  },
  "ginger": {
    name: "Ginger (Akekaduro)",
    scientificName: "Zingiber officinale",
    localNames: ["Akekaduro"],
    safetyStatus: "SAFE",
    status: "SAFE",
    pregnancySafety: "Safe in culinary amounts (<1g dried ginger daily). Effective for morning sickness.",
    breastfeedingSafety: "Safe in normal dietary amounts.",
    trimesterConsiderations: "First trimester antiemetic.",
    clinicalSummary: "Clinical evidence supports low-dose fresh ginger for quelling first-trimester nausea and vomiting. Avoid concentrated medicinal doses or dry extracts in early pregnancy.",
    keyRisksOrBenefits: [
      "Relieves morning sickness and early pregnancy nausea",
      "Aids digestion and reduces bloating",
      "Use culinary amounts (<1g dry/day)"
    ],
    twiSummary: "ÉHO HO: Akekaduro yɛ ma feɛeɛ wɔ nyinsɛn mfitiaseɛ. Mfa pii pii nni dwuma."
  }
};

/** Normalization helper */
function normalize(q) {
  const clean = (q || "").trim().toLowerCase();
  return LOCAL_NAME_MAP[clean] || clean;
}

/**
 * 3-Tier Single Item Safety Check
 */
export async function checkItemSafety(query) {
  if (!query || !query.trim()) return null;
  const clean = normalize(query);

  // Tier 1: Instant Offline Local Match
  if (LOCAL_SAFETY_CATALOG[clean]) {
    return { ...LOCAL_SAFETY_CATALOG[clean], source: "offline_bundle" };
  }

  // Tier 2: Supabase Cloud Community Cache
  try {
    const { data: cached } = await supabase
      .from("safety_searches_cache")
      .select("verdict_json")
      .eq("query_hash", `single:${clean}`)
      .maybeSingle();

    if (cached && cached.verdict_json) {
      return { ...cached.verdict_json, source: "cloud_cache" };
    }
  } catch (err) {
    console.warn("[SafetyService] Cloud cache check notice:", err);
  }

  // If offline and missed local bundle
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      name: query,
      safetyStatus: "UNKNOWN",
      status: "UNKNOWN",
      clinicalSummary: "Offline: Item not in local catalog yet. Reconnect to internet for full Gemini clinical review.",
      pregnancySafety: "Consult your midwife before consuming unknown herbs.",
      source: "offline_fallback"
    };
  }

  // Tier 3: Live Render Backend (Gemini Clinical Engine)
  try {
    const res = await fetch(`${API_BASE}/herbal-safety/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean, herbName: clean })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.name || data.herbName)) {
        return { ...data, source: "live_ai" };
      }
    }
  } catch (err) {
    console.warn("[SafetyService] Live API query notice:", err);
  }

  return {
    name: query,
    safetyStatus: "CAUTION",
    status: "CAUTION",
    clinicalSummary: "Unable to connect to live clinical engine. Always consult your midwife before taking unverified herbal tonics.",
    pregnancySafety: "Exercise caution during pregnancy.",
    source: "error_fallback"
  };
}

/**
 * 3-Tier Herbal & Drug Combination Check
 */
export async function checkCombination(item1, item2) {
  if (!item1 || !item2) return null;

  const norm1 = normalize(item1);
  const norm2 = normalize(item2);
  const comboKey = [norm1, norm2].sort().join("___");

  // Tier 1: Supabase Community Cache
  try {
    const { data: cached } = await supabase
      .from("safety_searches_cache")
      .select("verdict_json")
      .eq("query_hash", `combo:${comboKey}`)
      .maybeSingle();

    if (cached && cached.verdict_json) {
      return { ...cached.verdict_json, source: "cloud_cache" };
    }
  } catch (err) {
    console.warn("[SafetyService] Cloud combo check notice:", err);
  }

  // Tier 2: Live Render Backend
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const res = await fetch(`${API_BASE}/herbal-safety/evaluate-combo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item1, item2 })
      });
      if (res.ok) {
        const data = await res.json();
        return { ...data, source: "live_ai" };
      }
    } catch (e) {
      console.warn("[SafetyService] Backend combination check notice:", e);
    }
  }

  return {
    item1,
    item2,
    status: "CAUTION",
    summary: "Combination details unavailable offline. Avoid mixing herbal tonics with prescription medicines without clinical advice.",
    timingRecommendation: "Space out intake by at least 2 hours.",
    source: "offline_fallback"
  };
}
