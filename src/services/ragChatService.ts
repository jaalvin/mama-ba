import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { VitalsService } from './vitalsService';

export interface ChatRequest {
  userId: string;
  query: string;
  language?: 'twi' | 'english' | 'dual';
  sessionMemory?: string;
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
    const targetUserId = req.userId || 'demo-patient-001';

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

    // 1b. Fetch patient clinical vitals logs
    let vitalsSummary = "No recent vitals logged.";
    try {
      const recentVitals = await VitalsService.getVitalsHistory(targetUserId, 5);
      if (recentVitals && recentVitals.length > 0) {
        vitalsSummary = recentVitals.map((v: any) => {
          const bp = (v.systolic_bp || v.bp_systolic) && (v.diastolic_bp || v.bp_diastolic) ? `BP: ${v.systolic_bp || v.bp_systolic}/${v.diastolic_bp || v.bp_diastolic} mmHg` : null;
          const temp = v.body_temperature ? `Temp: ${v.body_temperature}°C` : null;
          const sugar = v.blood_glucose ? `Blood Sugar: ${v.blood_glucose} mmol/L` : null;
          const weight = v.weight_kg ? `Weight: ${v.weight_kg}kg` : null;
          const status = v.vital_status ? `Status: ${v.vital_status}` : null;
          return [bp, temp, sugar, weight, status].filter(Boolean).join(", ") + ` (Logged: ${v.logged_at ? String(v.logged_at).slice(0, 10) : 'Recent'})`;
        }).join("\n");
      }
    } catch (e) {
      console.warn('[RAG] Vitals history fetch notice:', e);
    }

    // 1c. Fetch patient health diary entries
    let journalSummary = "No health diary entries.";
    try {
      const recentJournals = VitalsService.getJournalHistory(targetUserId);
      if (recentJournals && recentJournals.length > 0) {
        journalSummary = (recentJournals as any[]).slice(0, 3).map((j: any) => {
          const symptoms = j.symptoms_noted ? (typeof j.symptoms_noted === 'string' ? j.symptoms_noted : JSON.stringify(j.symptoms_noted)) : "None";
          return `Date: ${j.entry_date}, Mood: ${j.mood || 'N/A'}, Symptoms: ${symptoms}, Notes: ${j.notes_text || 'None'}`;
        }).join("\n");
      }
    } catch (e) {
      console.warn('[RAG] Journal history fetch notice:', e);
    }

    // 1d. Fetch persistent chat history memory
    let historyContext = "";
    try {
      const pastHistory = await RAGChatService.getChatHistory(targetUserId, 8);
      if (pastHistory && pastHistory.length > 0) {
        historyContext = (pastHistory as any[]).map((h: any) =>
          `User: "${h.user_query}"\nAbena AI: "${h.answer_english || h.answer_twi}"`
        ).join("\n");
      }
    } catch (e) {
      console.warn('[RAG] Chat history fetch notice:', e);
    }

    // 1e. Clean response helper to strip headers, bold, bullets, hyphens, and put question at the end
    const sanitizeText = (text: string): string => {
      if (!text) return "";
      let clean = text
        .replace(/(Warm Validation|Common Reasons & Follow-up Question|Common Reasons|Practical Home Measures|Red-Flag Danger Signs|Danger Signs|Home Measures|Validation|Follow-up Question)[:\-\s]*/gi, "")
        .replace(/^\d+[\.\)]\s*/gm, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/^[\s\*\-•]+\s*/gm, "")
        .replace(/[\*\-•]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
      const nonQuestions: string[] = [];
      const questions: string[] = [];

      for (const sentence of sentences) {
        const s = sentence.trim();
        if (s.endsWith("?")) {
          questions.push(s);
        } else if (s) {
          nonQuestions.push(s);
        }
      }

      if (questions.length > 0) {
        clean = [...nonQuestions, ...questions].join(" ");
      }

      return clean;
    };

    let englishAnswer = '';
    let twiAnswer = '';
    let responseSource: 'gemini_medical_ai' | 'groq_medical_ai' | 'offline_knowledge_base' = 'offline_knowledge_base';

    const prompt = `
You are "Mama Ba" (The Guided Health Companion) — an empathetic, culturally grounded healthcare AI supporting Ghanaian mothers and caregivers.
Keep your response concise, empathetic, and short (max 60–90 words total).

PATIENT CLINICAL VITAL LOGS CONTEXT:
${vitalsSummary}

PATIENT HEALTH DIARY LOGS:
${journalSummary}

${req.sessionMemory ? `APP SESSION ACTIVITY / AI MEMORY:\n${req.sessionMemory}\n` : ''}

PREVIOUS CHAT CONVERSATION HISTORY (PERSISTENT MEMORY):
${historyContext || 'No previous chat history.'}

STRICT CLINICAL & MEMORY INSTRUCTIONS:
- You MUST consider the patient's recorded vital logs (BP, temperature, blood sugar, weight) and health diary notes to make informed, personalized decisions about what is going on with the patient.
- Remember details from previous chat conversations above and cross-reference them with the current query.
- Do NOT output any section headers or category titles (such as "Warm Validation", "Common Reasons", "Practical Home Measures", "Red-Flag Danger Signs", etc.).
- Do NOT use any bolding (**), bullet points (*, -, •), or hyphens before sentences.
- Write in plain, fluid sentences.
- If you ask a follow-up question, put it at the VERY END of your response.

Current User Query: "${englishQuery}"

Local Guidance Reference:
- English: "${bestMatch ? bestMatch.answer_english : 'Eat iron-rich foods like Kontomire, stay hydrated, and rest.'}"
- Twi: "${bestMatch ? bestMatch.answer_twi : 'Di nnuane a dadeɛ wom te sɛ kontomire, nom nsuo pii, na gye wo ho ahome.'}"

JSON Output Format (Strictly valid JSON):
{
  "english": "Concise plain text response without headers or bullet points. Ask any follow-up question at the end.",
  "twi": "Authentic Asante Twi translation in plain text without headers or bullet points."
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

    const cleanEn = sanitizeText(englishAnswer);
    const cleanTwi = sanitizeText(twiAnswer);

    const response: ChatResponse = {
      answerEnglish: cleanEn,
      answerTwi: cleanTwi,
      source: responseSource,
      disclaimer: 'Guidance provided for educational companion use only. Consult a qualified clinician for clinical diagnosis.',
      matchedCategory: bestMatch ? bestMatch.category : 'Maternal Health'
    };

    // Save interaction to SQLite history table & Supabase Cloud
    const chatId = `chat-${Date.now()}`;

    try {
      const saveStmt = db.prepare(`
        INSERT INTO chat_history (id, user_id, user_query, answer_english, answer_twi, source, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      saveStmt.run(
        chatId,
        targetUserId,
        originalQuery,
        response.answerEnglish,
        response.answerTwi,
        response.source,
        response.matchedCategory
      );
    } catch (e) {
      console.warn('[RAG] Failed to save local chat history:', e);
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('chat_history').upsert({
          id: chatId,
          user_id: targetUserId,
          query: originalQuery,
          user_query: originalQuery,
          answer_english: response.answerEnglish,
          answer_twi: response.answerTwi,
          source: response.source,
          category: response.matchedCategory
        });
      } catch (e) {
        console.warn('[RAG] Supabase chat_history sync notice:', e);
      }
    }

    return response;
  }

  static async getChatHistory(userId: string, limit: number = 50) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('chat_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data.map(r => ({
            id: r.id,
            user_id: r.user_id,
            user_query: r.query || r.user_query,
            answer_english: r.answer_english,
            answer_twi: r.answer_twi,
            source: r.source,
            category: r.category,
            created_at: r.created_at
          }));
        }
      } catch { /* fallback to sqlite */ }
    }

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
