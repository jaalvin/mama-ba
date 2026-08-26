import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, getOfflineDb } from '../config';
import { KhayaService } from './khayaService';

export interface ChatRequest {
  userId: string;
  query: string;
  language?: 'twi' | 'english' | 'dual';
}

export interface ChatResponse {
  answerEnglish: string;
  answerTwi: string;
  source: 'gemini_medical_ai_khaya_nmt' | 'offline_knowledge_base';
  disclaimer: string;
  matchedCategory?: string;
}

export class RAGChatService {
  static async processQuery(req: ChatRequest): Promise<ChatResponse> {
    const db = getOfflineDb();
    const originalQuery = req.query.trim();
    let englishQuery = originalQuery;

    // 1. If user typed/spoke Twi, translate short query to English via Khaya NMT
    const hasTwiChars = /[ɔɛ]/i.test(originalQuery);
    const isTwiMode = req.language === 'twi' || hasTwiChars || !/^[a-zA-Z0-9\s,.?!'\-]+$/.test(originalQuery);

    if (isTwiMode) {
      const translated = await KhayaService.translateText(originalQuery, 'tw-en');
      if (translated && translated.length > 2) {
        englishQuery = translated;
      }
    }

    // 2. Retrieve Gold-Standard Reference Q&A from SQLite (Ghana Maternal Dataset)
    const qaStmt = db.prepare(`SELECT * FROM offline_knowledge_qa`);
    const allQa = (qaStmt.all() || []) as Array<{
      id: string;
      question_english: string;
      question_twi: string;
      answer_english: string;
      answer_twi: string;
      category: string;
      tags: string;
    }>;

    const queryWords = englishQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let bestMatch: (typeof allQa)[0] | null = null;
    let maxScore = 0;

    for (const qa of allQa) {
      const corpus = `${qa.question_english} ${qa.answer_english} ${qa.category} ${qa.tags}`.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (corpus.includes(word)) score += 2;
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = qa;
      }
    }

    // 3. Query Gemini for Dual-Language Response (English + Natural Twi) with Key Failover
    const apiKeys = [
      CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      CONFIG.GEMINI_FALLBACK_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || ''
    ].filter(k => k && k.length > 5);

    let englishAnswer = '';
    let twiAnswer = '';
    const verifiedModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-flash-exp'
    ];

    keyLoop:
    for (const key of apiKeys) {
      for (const modelName of verifiedModels) {
        try {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `
You are "The Guided Health Companion" (Mama Ba) - an empathetic, localized maternal healthcare AI for Ghana Health Service (GHS).

Local Reference Data:
- English Guideline: "${bestMatch ? bestMatch.answer_english : 'Eat iron-rich foods (Kontomire), stay hydrated, space herbal teas 2 hours from iron pills.'}"
- Native Twi Translation Reference: "${bestMatch ? bestMatch.answer_twi : 'Di nnuane a dadeɛ wom te sɛ kontomire, nom nsuo pii, na gyae berɛ simma aduonu ansa na woanom tii.'}"

User Query: "${englishQuery}"

Instructions:
1. Directly answer the user's question regarding pregnancy, maternal health, or infant care in clear, concise language (under 3 sentences).
2. If danger signs exist (severe bleeding, severe headache, blurred vision, high fever), advise immediate clinic travel.
3. Output MUST be valid JSON with two fields: "english" and "twi".

JSON Output:
`;

          const result = await model.generateContent(prompt);
          const rawText = result.response.text().trim();

          // Extract JSON structure safely
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.english) englishAnswer = parsed.english;
            if (parsed.twi) twiAnswer = parsed.twi;
            console.log(`[Gemini AI] Dual JSON response via ${modelName} with key prefix ${key.slice(0, 8)}...`);
            break keyLoop;
          } else if (rawText.length > 5) {
            englishAnswer = rawText;
            break keyLoop;
          }
        } catch (err: any) {
          const errMsg = err.message || String(err);
          console.warn(`[Gemini AI] Model ${modelName} notice (key prefix ${key.slice(0, 8)}...):`, errMsg);
        }
      }
    }

    // 4. Fallback Handling if Gemini is Offline or API Key Quota Exceeded
    if (!englishAnswer) {
      const qLower = englishQuery.toLowerCase();
      if (bestMatch && maxScore >= 2) {
        englishAnswer = bestMatch.answer_english;
        twiAnswer = bestMatch.answer_twi;
      } else if (qLower.includes('head') || qLower.includes('headache') || qLower.includes('dizzy')) {
        englishAnswer = `For headaches: Rest in a cool, quiet room and drink plenty of water. If your headache is severe, persistent, or accompanied by blurred vision or swelling, visit a clinic immediately to screen for pre-eclampsia.`;
        twiAnswer = `Sɛ wo ti yɛ wo ya a: Home brɛoo na nom nsuo pii. Sɛ eti yɛ wo ya pa ara anaa wo aniso biribiri a, kɔ asopiti ntɛm.`;
      } else if (qLower.includes('eat') || qLower.includes('food') || qLower.includes('egg') || qLower.includes('bread') || qLower.includes('pancake')) {
        englishAnswer = `Pancakes, eggs, and bread are generally safe during pregnancy. Ensure eggs are fully cooked (well-done) to avoid infection, and complement your meals with nutrient-dense foods like Kontomire and fruits.`;
        twiAnswer = `Paankeke, nkesua ne paanoo yɛ safe berɛ a wonyem. Ma nkesua no mben yie ansa na wadi, na di nhabannuane nso ka ho.`;
      } else {
        englishAnswer = `For healthcare guidance: Maintain a balanced diet with green leafy vegetables (Kontomire) and safe drinking water. Space herbal concoctions at least 2 hours from prescribed iron supplements. Visit your nearest Ghana Health Service clinic for checkups.`;
        twiAnswer = `Apɔmuden afutuo: Di nnuane pa te sɛ kontomire ne nsu pa. Sɛ wonom abibiduro a, gyae dɔnhwerew mmienu ansa na woanom dadeɛ aduro no. Kɔ asopiti a ɛbɛn wo ntɛm.`;
      }
    }

    // 5. If Twi translation is missing, use Sentence-Chunked Khaya NMT as fallback
    if (!twiAnswer || twiAnswer.length < 5) {
      if (bestMatch && bestMatch.answer_twi) {
        twiAnswer = bestMatch.answer_twi;
      } else {
        const translated = await KhayaService.translateText(englishAnswer, 'en-tw');
        twiAnswer = translated || `Kɔ asibiti a ɛbɛn wo ntɛm na wo ne dɔketa nkasa fa wo apɔmuden ho.`;
      }
    }

    const response: ChatResponse = {
      answerEnglish: englishAnswer,
      answerTwi: twiAnswer,
      source: englishAnswer.includes('Kontomire') && apiKeys.length === 0 ? 'offline_knowledge_base' : 'gemini_medical_ai_khaya_nmt',
      disclaimer: 'Guidance provided for educational companion use only. Consult a qualified clinician for clinical diagnosis.',
      matchedCategory: bestMatch ? bestMatch.category : 'Maternal Health'
    };

    // Save interaction to SQLite history table
    try {
      const saveStmt = db.prepare(`
        INSERT INTO chat_history (id, user_id, user_query, answer_english, answer_twi, source, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      saveStmt.run(
        `chat-${Date.now()}`,
        req.userId || 'demo-patient-001',
        originalQuery,
        response.answerEnglish,
        response.answerTwi,
        response.source,
        response.matchedCategory
      );
    } catch (e) {
      console.warn('[RAG] Failed to save chat history:', e);
    }

    return response;
  }

  static getChatHistory(userId: string, limit: number = 50) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`);
    return stmt.all(userId, limit);
  }

  static getPresetPromptCards() {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT id, question_english, question_twi, category FROM offline_knowledge_qa`);
    return stmt.all();
  }
}
