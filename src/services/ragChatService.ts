import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, getOfflineDb } from '../config';

export interface ChatRequest {
  userId: string;
  query: string;
  language?: 'twi' | 'english' | 'dual';
}

export interface ChatResponse {
  answerEnglish: string;
  answerTwi: string;
  source: 'gemini_medical_ai' | 'groq_medical_ai' | 'offline_knowledge_base';
  disclaimer: string;
  matchedCategory?: string;
}

export class RAGChatService {
  private static async queryGroqAi(prompt: string): Promise<{ english: string; twi: string } | null> {
    const groqKey = CONFIG.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
    if (!groqKey) return null;

    const models = ['groq/compound-mini', 'groq/compound', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];

    for (const modelName of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as any;
          const rawText = data.choices && data.choices[0] ? data.choices[0].message.content : '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.english && parsed.twi) {
              console.log(`[Groq AI] Dual JSON response generated via model ${modelName}`);
              return { english: parsed.english, twi: parsed.twi };
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Groq AI] Model ${modelName} notice:`, err.message || err);
      }
    }
    return null;
  }

  static async processQuery(req: ChatRequest): Promise<ChatResponse> {
    const db = getOfflineDb();
    const originalQuery = req.query.trim();
    const englishQuery = originalQuery;

    // 1. Retrieve Gold-Standard Reference Q&A from SQLite (Ghana Maternal Dataset)
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

    const STOP_WORDS = new Set([
      'can', 'could', 'during', 'this', 'that', 'time', 'what', 'when', 'where', 'which',
      'with', 'have', 'has', 'had', 'from', 'for', 'are', 'was', 'were', 'the', 'and',
      'you', 'your', 'about', 'some', 'will', 'would', 'should', 'good', 'how', 'why',
      'take', 'give', 'make', 'do', 'does', 'did', 'is', 'it', 'in', 'on', 'at', 'to'
    ]);

    const queryWords = englishQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    let bestMatch: (typeof allQa)[0] | null = null;
    let maxScore = 0;

    for (const qa of allQa) {
      const corpus = `${qa.question_english} ${qa.answer_english} ${qa.category} ${qa.tags}`.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (corpus.includes(word)) score += 3;
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = qa;
      }
    }

    let englishAnswer = '';
    let twiAnswer = '';
    let responseSource: 'gemini_medical_ai' | 'groq_medical_ai' | 'offline_knowledge_base' = 'offline_knowledge_base';

    const prompt = `
You are "Mama Ba" (The Guided Health Companion) — an empathetic, localized maternal healthcare AI supporting Ghanaian mothers, patients, and caregivers.
You do not give final diagnostic labels, but you think and communicate with the thoroughness, empathy, and logic of a community clinician.

User Query: "${englishQuery}"

Local Reference Data:
- English Guideline: "${bestMatch ? bestMatch.answer_english : 'Eat iron-rich foods (Kontomire), stay hydrated, space herbal teas 2 hours from iron pills.'}"
- Twi Guideline: "${bestMatch ? bestMatch.answer_twi : 'Di nnuane a dadeɛ wom te sɛ kontomire, nom nsuo pii, na gyae berɛ simma aduonu ansa na woanom tii.'}"

When a user presents a symptom or question, structure your response using this 4-step clinical flow:
1. EMPATHY & VALIDATION: Acknowledge the symptom warmly. Validate how exhausting or distressing it feels in a calm, reassuring tone.
2. INVESTIGATE ROOT CAUSES: Explain 2-3 common potential reasons tailored to the Ghanaian context. Ask 2 targeted follow-up questions to pinpoint the cause.
3. ACTIONABLE HOME & DIETARY MEASURES: Provide practical, culturally relevant relief steps.
4. RED-FLAG DANGER SIGNS & CLINICAL ESCALATION: Clearly state emergency thresholds requiring immediate visit to the nearest Ghana Health Service (GHS) clinic.

Respond strictly in valid JSON format containing exactly two keys:
1. "english": Structured clinical consultation response in English.
2. "twi": Authentic, natural Ghanaian Twi (Akan) translation covering the advice.

JSON format:
{
  "english": "Your structured response in English here.",
  "twi": "Your Twi response here."
}
`;

    // 2. Primary LLM: Query Gemini for Dual-Language Response (English + Native Twi)
    const apiKeys = [
      CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      CONFIG.GEMINI_FALLBACK_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || ''
    ].filter(k => k && k.length > 5);

    const verifiedModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    keyLoop:
    for (const key of apiKeys) {
      for (const modelName of verifiedModels) {
        try {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          });

          const result = await model.generateContent(prompt);
          const rawText = result.response.text().trim();

          let parsed: any = null;
          try {
            parsed = JSON.parse(rawText);
          } catch (e) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
          }

          if (parsed && parsed.english && parsed.twi) {
            englishAnswer = parsed.english;
            twiAnswer = parsed.twi;
            console.log(`[Gemini AI] Dual JSON response via ${modelName}`);
            responseSource = 'gemini_medical_ai';
            break keyLoop;
          } else if (parsed && parsed.english) {
            englishAnswer = parsed.english;
            if (parsed.twi) twiAnswer = parsed.twi;
            responseSource = 'gemini_medical_ai';
            break keyLoop;
          }
        } catch (err: any) {
          const errMsg = err.message || String(err);
          console.warn(`[Gemini AI] Model ${modelName} notice:`, errMsg);
          if (errMsg.includes('403') || errMsg.includes('429') || errMsg.includes('Forbidden') || errMsg.includes('Quota') || errMsg.includes('API_KEY_INVALID')) {
            break;
          }
        }
      }
    }

    // 3. Groq LLM Fallback (when Gemini fails or reaches quota)
    if (!englishAnswer) {
      console.log('[RAG] Gemini AI unavailable, triggering Groq AI fallback...');
      const groqRes = await this.queryGroqAi(prompt);
      if (groqRes) {
        englishAnswer = groqRes.english;
        twiAnswer = groqRes.twi;
        responseSource = 'groq_medical_ai';
      }
    }

    // 4. Offline Knowledge Base Fallback
    if (!englishAnswer) {
      responseSource = 'offline_knowledge_base';
      const qLower = englishQuery.toLowerCase();
      if (bestMatch && maxScore >= 1) {
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

    if (!twiAnswer || twiAnswer.length < 5) {
      if (bestMatch && bestMatch.answer_twi) {
        twiAnswer = bestMatch.answer_twi;
      } else {
        twiAnswer = `Kɔ asibiti a ɛbɛn wo ntɛm na wo ne dɔketa nkasa fa wo apɔmuden ho.`;
      }
    }

    const response: ChatResponse = {
      answerEnglish: englishAnswer,
      answerTwi: twiAnswer,
      source: responseSource,
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
