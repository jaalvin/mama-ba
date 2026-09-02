import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import crypto from 'crypto';

export interface HerbalSafetyRequest {
  herbName?: string;
  pharmaDrugName?: string;
  foodItem?: string;
  query?: string;
}

export interface StructuredSafetyCard {
  name: string;
  scientificName: string;
  localNames: string[];
  safetyStatus: 'SAFE' | 'CAUTION' | 'AVOID' | 'UNKNOWN';
  pregnancySafety: string;
  breastfeedingSafety: string;
  trimesterConsiderations: string;
  clinicalSummary: string;
  keyRisksOrBenefits: string[];
  twiSummary?: string;
  source?: 'local_cache' | 'gemini_clinical_engine' | 'groq_clinical_engine' | 'fallback_baseline';
}

export interface StructuredComboCard {
  item1: string;
  item2: string;
  status: 'SAFE' | 'CAUTION' | 'AVOID';
  summary: string;
  timingRecommendation: string;
  riskOrMechanism: string;
  twiSummary?: string;
  source?: 'local_combo_cache' | 'gemini_clinical_engine' | 'groq_clinical_engine' | 'fallback_baseline';
}

export interface HerbalSafetyResponse {
  severity: 'SAFE' | 'CAUTION' | 'DANGER' | 'NO_KNOWN_INTERACTION';
  herbName: string;
  pharmaDrugName: string;
  foodItem: string | null;
  interactionDetails: string;
  culturalAdviceTwi: string;
  culturalAdviceEnglish: string;
  allRecordsChecked: number;
  structuredCard?: StructuredSafetyCard;
}

// ── Dialect & Local Name Normalization ────────────────────────────────────────
const LOCAL_NAME_MAP: Record<string, string> = {
  // Vegetables & Foods
  "nkruma": "okro",
  "okra": "okro",
  "fetri": "okro",
  "lady's fingers": "okro",
  "ladys fingers": "okro",
  "kontomire": "cocoyam leaves",
  "abunabun": "cocoyam leaves",
  "kpakpo shito": "scotch bonnet pepper",
  "bofre": "pawpaw",
  "bofrɛ": "pawpaw",
  "papaya": "pawpaw",
  "hausa koko": "fermented millet porridge",
  "koko": "fermented millet porridge",
  "ampesi": "boiled plantain/yam with kontomire",
  "plantain": "plantain",
  "borode": "plantain",
  "bɔrodɛ": "plantain",

  // Herbs & Spices
  "prekese": "tetrapleura tetraptera",
  "prɛkɛsɛ": "tetrapleura tetraptera",
  "sobolo": "hibiscus sabdariffa",
  "zobo": "hibiscus sabdariffa",
  "nunum": "african basil",
  "nyanya": "momordica foetida",
  "dawa dawa": "fermented locust bean",
  "dawadawa": "fermented locust bean",
  "taabea": "taabea herbal mixture",
  "akekaduro": "ginger",
  "moringa": "moringa oleifera",
  "neem": "neem leaves",
  "donkonyi": "neem leaves",
  "guava": "guava leaves",
  "wiaso": "guava leaves",

  // Common Medications
  "paracetamol": "paracetamol",
  "panadol": "paracetamol",
  "coartem": "artemether-lumefantrine",
  "artemether": "artemether-lumefantrine",
  "iron": "iron & folic acid",
  "iron tablets": "iron & folic acid",
  "iron supplement": "iron & folic acid",
  "folic acid": "iron & folic acid",
  "flagyl": "metronidazole",
  "amoxil": "amoxicillin",
  "advil": "ibuprofen",
  "nurofen": "ibuprofen"
};

export function normalizeQuery(query: string): string {
  const cleaned = query.trim().toLowerCase();
  return LOCAL_NAME_MAP[cleaned] || cleaned;
}

export class HerbalService {
  /**
   * Ensure herb_safety_cache & herb_combo_cache tables exist in SQLite
   */
  private static initCacheTable() {
    const db = getOfflineDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS herb_safety_cache (
        id TEXT PRIMARY KEY,
        query_key TEXT UNIQUE,
        name TEXT NOT NULL,
        scientific_name TEXT,
        local_names TEXT,
        safety_status TEXT NOT NULL,
        pregnancy_safety TEXT,
        breastfeeding_safety TEXT,
        trimester_considerations TEXT,
        clinical_summary TEXT,
        key_risks_benefits TEXT,
        twi_summary TEXT,
        source TEXT DEFAULT 'gemini_clinical_engine',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS herb_combo_cache (
        id TEXT PRIMARY KEY,
        combo_key TEXT UNIQUE,
        item1 TEXT NOT NULL,
        item2 TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT,
        timing_recommendation TEXT,
        risk_or_mechanism TEXT,
        twi_summary TEXT,
        source TEXT DEFAULT 'gemini_clinical_engine',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Evaluate Combination Interaction Safety during Pregnancy & Breastfeeding
   */
  static async evaluateCombinationSafety(rawItem1: string, rawItem2: string): Promise<StructuredComboCard> {
    this.initCacheTable();
    const db = getOfflineDb();

    const norm1 = normalizeQuery(rawItem1);
    const norm2 = normalizeQuery(rawItem2);
    const comboKey = [norm1, norm2].sort().join('___');

    // ── 1. Check Supabase Cloud Cache & Local SQLite Cache ───────────────────
    const comboHash = crypto.createHash('md5').update(`combo:${comboKey}`).digest('hex');
    try {
      const { data: cached } = await supabaseAdmin
        .from('safety_searches_cache')
        .select('verdict_json')
        .eq('query_hash', comboHash)
        .maybeSingle();

      if (cached && cached.verdict_json) {
        console.log(`[Supabase Cloud Cache HIT] for "${rawItem1} + ${rawItem2}"`);
        return { ...cached.verdict_json, source: 'supabase_cloud_cache' };
      }
    } catch (e) {
      /* Supabase fallback notice ignored */
    }

    try {
      const cachedStmt = db.prepare(`SELECT * FROM herb_combo_cache WHERE combo_key = ?`);
      const row = cachedStmt.get(comboKey) as any;

      if (row) {
        console.log(`[Hybrid Combo Pipeline] Cache HIT for "${rawItem1} + ${rawItem2}"`);
        return {
          item1: row.item1,
          item2: row.item2,
          status: row.status as any,
          summary: row.summary || '',
          timingRecommendation: row.timing_recommendation || '',
          riskOrMechanism: row.risk_or_mechanism || '',
          twiSummary: row.twi_summary || '',
          source: 'local_combo_cache'
        };
      }
    } catch (e) {
      console.warn('[Hybrid Combo Pipeline] Cache read error:', e);
    }

    // ── 2. Call Gemini API with Strict Combination JSON Schema ───────────────
    const apiKeys = [
      CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      CONFIG.GEMINI_FALLBACK_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || ''
    ].filter(k => k && k.length > 5);

    const verifiedModels = ['gemini-2.5-flash'];

    const systemPrompt = `
You are an expert maternal-fetal clinical pharmacology and ethnobotanical safety engine.
You evaluate drug-drug, herb-drug, food-drug, and food-food interactions during pregnancy.
Pay specific attention to:
- West African herbs/foods (Sobolo/Hibiscus, Prekese, Neem, Kontomire, Moringa, Ginger, Taabea).
- Common prenatal medications (Iron/Fefol, Folic Acid, Calcium, Paracetamol, Antimalarials/Coartem).
- Common absorption blocks (e.g., Tannins/Polyphenols in tea/Sobolo blocking iron absorption; Calcium blocking iron).
- Additive risks (e.g., two uterine stimulants taken together).

Return ONLY valid JSON matching this exact structure:
{
  "item1": "${rawItem1}",
  "item2": "${rawItem2}",
  "status": "CAUTION", // Must be "SAFE", "CAUTION", or "AVOID"
  "summary": "Clear 1-2 sentence explanation for the pregnant mother.",
  "timingRecommendation": "Actionable advice, e.g. separate by at least 2 hours or take together with meals.",
  "riskOrMechanism": "Medical explanation of absorption inhibition, toxicity, or uterine effects.",
  "twiSummary": "Concise 1-2 sentence Twi (Akan) summary."
}
`;

    let card: StructuredComboCard | null = null;

    if (apiKeys.length > 0) {
      keyLoop:
      for (const key of apiKeys) {
        for (const modelName of verifiedModels) {
          try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                maxOutputTokens: 512,
                temperature: 0.1,
                responseMimeType: 'application/json'
              }
            });

            const userPrompt = `${systemPrompt}\n\nEvaluate the interaction safety during pregnancy between: "${rawItem1}" and "${rawItem2}"`;
            const result = await model.generateContent(userPrompt);
            const rawText = result.response.text().trim();

            let parsed: any = null;
            try {
              parsed = JSON.parse(rawText);
            } catch (err) {
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            }

            if (parsed && parsed.status && parsed.summary) {
              card = {
                item1: parsed.item1 || rawItem1,
                item2: parsed.item2 || rawItem2,
                status: (['SAFE', 'CAUTION', 'AVOID'].includes(parsed.status.toUpperCase()) ? parsed.status.toUpperCase() : 'CAUTION') as any,
                summary: parsed.summary,
                timingRecommendation: parsed.timingRecommendation || 'Space out intake by 2 hours.',
                riskOrMechanism: parsed.riskOrMechanism || '',
                twiSummary: parsed.twiSummary || '',
                source: 'gemini_clinical_engine'
              };
              console.log(`[Hybrid Combo Pipeline] Gemini evaluation success via ${modelName} for "${rawItem1} + ${rawItem2}"`);
              break keyLoop;
            }
          } catch (err: any) {
            console.warn(`[Hybrid Combo Pipeline] Gemini ${modelName} notice:`, err.message || err);
          }
        }
      }
    }

    // ── 3. Groq AI Fallback ───────────────────────────────────────────────────
    if (!card) {
      const groqKey = CONFIG.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
      if (groqKey) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'groq/compound-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Evaluate interaction between: "${rawItem1}" and "${rawItem2}"` }
              ]
            })
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            const rawText = data.choices && data.choices[0] ? data.choices[0].message.content : '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed && parsed.status && parsed.summary) {
                card = {
                  item1: parsed.item1 || rawItem1,
                  item2: parsed.item2 || rawItem2,
                  status: (['SAFE', 'CAUTION', 'AVOID'].includes(parsed.status.toUpperCase()) ? parsed.status.toUpperCase() : 'CAUTION') as any,
                  summary: parsed.summary,
                  timingRecommendation: parsed.timingRecommendation || 'Space out intake by 2 hours.',
                  riskOrMechanism: parsed.riskOrMechanism || '',
                  twiSummary: parsed.twiSummary || '',
                  source: 'groq_clinical_engine'
                };
              }
            }
          }
        } catch (err: any) {
          console.warn('[Hybrid Combo Pipeline] Groq AI fallback notice:', err.message || err);
        }
      }
    }

    // ── 4. Fallback Baseline ──────────────────────────────────────────────────
    if (!card) {
      card = {
        item1: rawItem1,
        item2: rawItem2,
        status: 'CAUTION',
        summary: `Exercise caution when combining ${rawItem1} and ${rawItem2} during pregnancy.`,
        timingRecommendation: 'Space out intake by at least 2 hours.',
        riskOrMechanism: 'Potential absorption overlap or mild gastric interaction. Always space herbal teas and prescribed medicines by 2 hours.',
        twiSummary: 'ÈKA: Gye nnɔnhwerew 2 ntam bere a worenom aduro ne herbal tii.',
        source: 'fallback_baseline'
      };
    }

    // ── 5. Write-Through Cache to SQLite DB ──────────────────────────────────
    try {
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO herb_combo_cache (
          id, combo_key, item1, item2, status, summary,
          timing_recommendation, risk_or_mechanism, twi_summary, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const cacheId = `combo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      insertStmt.run(
        cacheId,
        comboKey,
        card.item1,
        card.item2,
        card.status,
        card.summary,
        card.timingRecommendation,
        card.riskOrMechanism,
        card.twiSummary || '',
        card.source || 'gemini_clinical_engine'
      );
      console.log(`[Hybrid Combo Pipeline] Write-through cache saved for "${comboKey}"`);
    } catch (e) {
      console.warn('[Hybrid Combo Pipeline] Cache write error:', e);
    }

    return card;
  }

  /**
   * Hybrid Intelligence Pipeline for Single Herb/Food/Drug
   */
  static async evaluateSafety(rawQuery: string): Promise<StructuredSafetyCard> {
    this.initCacheTable();
    const db = getOfflineDb();

    const queryKey = normalizeQuery(rawQuery);

    // 1. Check Supabase Cloud Cache & Local SQLite Cache
    const queryHash = crypto.createHash('md5').update(`single:${queryKey}`).digest('hex');
    try {
      const { data: cached } = await supabaseAdmin
        .from('safety_searches_cache')
        .select('verdict_json')
        .eq('query_hash', queryHash)
        .maybeSingle();

      if (cached && cached.verdict_json) {
        console.log(`[Supabase Cloud Cache HIT] for single item "${rawQuery}"`);
        return { ...cached.verdict_json, source: 'supabase_cloud_cache' };
      }
    } catch (e) {
      /* Supabase fallback notice ignored */
    }

    try {
      const cachedStmt = db.prepare(`SELECT * FROM herb_safety_cache WHERE query_key = ? OR name LIKE ? OR local_names LIKE ?`);
      const row = cachedStmt.get(queryKey, `%${queryKey}%`, `%${queryKey}%`) as any;

      if (row) {
        console.log(`[Hybrid Safety Pipeline] Cache HIT for "${rawQuery}" -> "${row.name}"`);
        return {
          name: row.name,
          scientificName: row.scientific_name || '',
          localNames: JSON.parse(row.local_names || '[]'),
          safetyStatus: row.safety_status as any,
          pregnancySafety: row.pregnancy_safety || '',
          breastfeedingSafety: row.breastfeeding_safety || '',
          trimesterConsiderations: row.trimester_considerations || '',
          clinicalSummary: row.clinical_summary || '',
          keyRisksOrBenefits: JSON.parse(row.key_risks_benefits || '[]'),
          twiSummary: row.twi_summary || '',
          source: 'local_cache'
        };
      }
    } catch (e) {
      console.warn('[Hybrid Safety Pipeline] Cache read error:', e);
    }

    // 2. Call Gemini API with Strict Clinical JSON Schema
    const apiKeys = [
      CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      CONFIG.GEMINI_FALLBACK_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || ''
    ].filter(k => k && k.length > 5);

    const verifiedModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    const systemPrompt = `
You are an expert maternal-fetal health and ethnobotanical clinical safety engine specialized in West African / Ghanaian culinary and medicinal herbs, foods, plants, and medications.
Analyze whether the provided food, plant, herb, or medication is safe during pregnancy and lactation.
Apply conservative obstetric safety standards:
- SAFE: Culinary foods with high nutritional value (e.g., Okro, Kontomire, Ginger in culinary amounts, Paracetamol).
- CAUTION: Mild uterine stimulants, concentrated teas, or items requiring dosage/trimester limits (e.g., Prekese in soups, Sobolo/Hibiscus, Metronidazole in 1st trimester).
- AVOID: Known emmenagogues, uterine stimulants, or hepatotoxic plants (e.g., concentrated Neem, Senna, Unripe Pawpaw latex, Ibuprofen after week 20, Taabea).

Return ONLY valid JSON matching this exact structure:
{
  "name": "Full Item Name (English Name)",
  "scientificName": "Botanical or Scientific Name",
  "localNames": ["Local Name 1", "Local Name 2", "Ghanaian Dialect Name"],
  "safetyStatus": "SAFE",
  "pregnancySafety": "Clear explanation of pregnancy safety.",
  "breastfeedingSafety": "Clear explanation of lactation safety.",
  "trimesterConsiderations": "Trimester guidance (e.g., Safe in all trimesters / Avoid in 1st trimester).",
  "clinicalSummary": "Comprehensive evidence-based clinical summary.",
  "keyRisksOrBenefits": [
    "Key clinical benefit or risk 1",
    "Key clinical benefit or risk 2",
    "Key clinical benefit or risk 3"
  ],
  "twiSummary": "Concise 1-2 sentence Twi (Akan) summary."
}
`;

    let card: StructuredSafetyCard | null = null;

    if (apiKeys.length > 0) {
      keyLoop:
      for (const key of apiKeys) {
        for (const modelName of verifiedModels) {
          try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                maxOutputTokens: 512,
                temperature: 0.1,
                responseMimeType: 'application/json'
              }
            });

            const userPrompt = `${systemPrompt}\n\nEvaluate the pregnancy and breastfeeding safety of: "${rawQuery}" (Normalized: "${queryKey}")`;
            const result = await model.generateContent(userPrompt);
            const rawText = result.response.text().trim();

            let parsed: any = null;
            try {
              parsed = JSON.parse(rawText);
            } catch (err) {
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            }

            if (parsed && parsed.name && parsed.safetyStatus) {
              card = {
                name: parsed.name,
                scientificName: parsed.scientificName || '',
                localNames: Array.isArray(parsed.localNames) ? parsed.localNames : [rawQuery],
                safetyStatus: (['SAFE', 'CAUTION', 'AVOID'].includes(parsed.safetyStatus.toUpperCase()) ? parsed.safetyStatus.toUpperCase() : 'CAUTION') as any,
                pregnancySafety: parsed.pregnancySafety || parsed.clinicalSummary || '',
                breastfeedingSafety: parsed.breastfeedingSafety || 'Safe during lactation.',
                trimesterConsiderations: parsed.trimesterConsiderations || 'Safe across all trimesters.',
                clinicalSummary: parsed.clinicalSummary || '',
                keyRisksOrBenefits: Array.isArray(parsed.keyRisksOrBenefits) ? parsed.keyRisksOrBenefits : [],
                twiSummary: parsed.twiSummary || '',
                source: 'gemini_clinical_engine'
              };
              console.log(`[Hybrid Safety Pipeline] Gemini evaluation success via ${modelName} for "${rawQuery}"`);
              break keyLoop;
            }
          } catch (err: any) {
            console.warn(`[Hybrid Safety Pipeline] Gemini ${modelName} notice:`, err.message || err);
          }
        }
      }
    }

    // 3. Groq AI Fallback
    if (!card) {
      const groqKey = CONFIG.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
      if (groqKey) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'groq/compound-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Evaluate the safety of: "${rawQuery}"` }
              ]
            })
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            const rawText = data.choices && data.choices[0] ? data.choices[0].message.content : '';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed && parsed.name && parsed.safetyStatus) {
                card = {
                  name: parsed.name,
                  scientificName: parsed.scientificName || '',
                  localNames: Array.isArray(parsed.localNames) ? parsed.localNames : [rawQuery],
                  safetyStatus: (['SAFE', 'CAUTION', 'AVOID'].includes(parsed.safetyStatus.toUpperCase()) ? parsed.safetyStatus.toUpperCase() : 'CAUTION') as any,
                  pregnancySafety: parsed.pregnancySafety || '',
                  breastfeedingSafety: parsed.breastfeedingSafety || 'Safe during lactation.',
                  trimesterConsiderations: parsed.trimesterConsiderations || 'Safe across all trimesters.',
                  clinicalSummary: parsed.clinicalSummary || '',
                  keyRisksOrBenefits: Array.isArray(parsed.keyRisksOrBenefits) ? parsed.keyRisksOrBenefits : [],
                  twiSummary: parsed.twiSummary || '',
                  source: 'groq_clinical_engine'
                };
              }
            }
          }
        } catch (err: any) {
          console.warn('[Hybrid Safety Pipeline] Groq AI fallback notice:', err.message || err);
        }
      }
    }

    // 4. Fallback Baseline
    if (!card) {
      card = {
        name: rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1),
        scientificName: '',
        localNames: [rawQuery],
        safetyStatus: 'CAUTION',
        pregnancySafety: 'Consult your midwife or doctor before consuming unverified herbal remedies.',
        breastfeedingSafety: 'Use with caution during breastfeeding.',
        trimesterConsiderations: 'Special caution during the first trimester.',
        clinicalSummary: `No detailed clinical record found for "${rawQuery}". Always consult your healthcare provider during pregnancy.`,
        keyRisksOrBenefits: ['Avoid concentrated extracts', 'Consult midwife or doctor'],
        twiSummary: 'Sɛ wonnye nni a, mfa mma wo ho bere a woyem. Bisa wo dɔkota ansa.',
        source: 'fallback_baseline'
      };
    }

    // 5. Write-Through Cache to SQLite DB
    try {
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO herb_safety_cache (
          id, query_key, name, scientific_name, local_names, safety_status,
          pregnancy_safety, breastfeeding_safety, trimester_considerations,
          clinical_summary, key_risks_benefits, twi_summary, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const cacheId = `cache-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      insertStmt.run(
        cacheId,
        queryKey,
        card.name,
        card.scientificName,
        JSON.stringify(card.localNames),
        card.safetyStatus,
        card.pregnancySafety,
        card.breastfeedingSafety,
        card.trimesterConsiderations,
        card.clinicalSummary,
        JSON.stringify(card.keyRisksOrBenefits),
        card.twiSummary || '',
        card.source || 'gemini_clinical_engine'
      );
      console.log(`[Hybrid Safety Pipeline] Write-through cache saved for "${queryKey}" ("${card.name}")`);
    } catch (e) {
      console.warn('[Hybrid Safety Pipeline] Cache write error:', e);
    }

    try {
      await supabaseAdmin.from('safety_searches_cache').upsert([
        {
          query_hash: queryHash,
          search_type: 'single_item',
          item1: card.name || rawQuery,
          verdict_json: card,
        }
      ], { onConflict: 'query_hash' });
    } catch (e) {
      /* Supabase write notice ignored */
    }

    return card;
  }

  static checkSafety(req: HerbalSafetyRequest): HerbalSafetyResponse {
    const db = getOfflineDb();

    const herb = (req.herbName || req.query || '').trim().toLowerCase();
    const drug = (req.pharmaDrugName || '').trim().toLowerCase();
    const food = (req.foodItem || '').trim().toLowerCase();

    const stmt = db.prepare(`SELECT * FROM herbal_drug_matrix`);
    const allRecords = (stmt.all() || []) as Array<{
      id: string;
      herb_name: string;
      herb_aliases: string;
      pharma_drug_name: string;
      food_item: string | null;
      severity: 'SAFE' | 'CAUTION' | 'DANGER';
      interaction_details: string;
      cultural_advice_twi: string;
      cultural_advice_english: string;
    }>;

    for (const record of allRecords) {
      const dbHerbName = record.herb_name.toLowerCase();
      const aliases: string[] = JSON.parse(record.herb_aliases || '[]').map((a: string) => a.toLowerCase());
      const dbDrugName = record.pharma_drug_name.toLowerCase();
      const dbFoodItem = (record.food_item || '').toLowerCase();

      const herbMatch = herb === '' || dbHerbName.includes(herb) || aliases.some(a => a.includes(herb) || herb.includes(a));
      const drugMatch = drug === '' || dbDrugName.includes(drug) || drug.includes(dbDrugName.split(' ')[0]);
      const foodMatch = food === '' || (dbFoodItem !== '' && (dbFoodItem.includes(food) || food.includes(dbFoodItem)));

      if (herbMatch && drugMatch && foodMatch && (herb !== '' || drug !== '' || food !== '')) {
        return {
          severity: record.severity,
          herbName: record.herb_name,
          pharmaDrugName: record.pharma_drug_name,
          foodItem: record.food_item,
          interactionDetails: record.interaction_details,
          culturalAdviceTwi: record.cultural_advice_twi,
          culturalAdviceEnglish: record.cultural_advice_english,
          allRecordsChecked: allRecords.length
        };
      }
    }

    return {
      severity: 'NO_KNOWN_INTERACTION',
      herbName: req.herbName || req.query || 'None Specified',
      pharmaDrugName: req.pharmaDrugName || 'None Specified',
      foodItem: req.foodItem || null,
      interactionDetails: 'No direct documented severe contraindication found in the Apomuden local database. Always space herbal teas and prescribed medicines by at least 2 hours.',
      culturalAdviceTwi: 'Nnuru ne herb foforɔ a wote no, twɛn dɔnhwerew 2 ansa na wanom na ammma w\'aduru adwumayɛ anntɔ ase.',
      culturalAdviceEnglish: 'Always space herbal teas and pharmaceutical medicines by 2 hours during pregnancy.',
      allRecordsChecked: allRecords.length
    };
  }

  static listAllMatrixItems() {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM herbal_drug_matrix`);
    return stmt.all();
  }
}
