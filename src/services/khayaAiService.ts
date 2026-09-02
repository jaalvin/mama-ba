import dotenv from 'dotenv';
import { CONFIG } from '../config';
dotenv.config();

export interface KhayaTtsOptions {
  text: string;
  language?: string;
  speaker_id?: string;
  speaker?: string;
  format?: string;
  output_format?: string;
  stream?: boolean;
}

export class KhayaAiService {
  private static baseUrl = process.env.KHAYA_API_BASE_URL || CONFIG.KHAYA_API_BASE_URL || 'https://translation-api.ghananlp.org';
  private static ttsCache = new Map<string, Buffer>();

  private static getApiKeys(): string[] {
    const keys = [
      process.env.KHAYA_MAMA_BA_PRIMARY_KEY || CONFIG.KHAYA_MAMA_BA_PRIMARY_KEY || '4a682539334843399c2345ab40df5aaa',
      process.env.KHAYA_MAMA_BA_SECONDARY_KEY || CONFIG.KHAYA_MAMA_BA_SECONDARY_KEY || '499ba20fba2f468994553592fc189f51',
      process.env.KHAYA_MB1_PRIMARY_KEY || CONFIG.KHAYA_MB1_PRIMARY_KEY || '63ec6d14d4e641d98a42054f7dc133d4',
      process.env.KHAYA_MB1_SECONDARY_KEY || CONFIG.KHAYA_MB1_SECONDARY_KEY || '674542d3e1564d54bdd6d7c96e391c2c'
    ].filter(k => k && k.length > 5);

    return [...new Set(keys)];
  }

  /**
   * Translates text between English & Ghanaian languages using Khaya Translation API v2
   */
  static async translateText(text: string, langPair: string = 'en-tw'): Promise<string | null> {
    const cleanText = (text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) {
      console.warn('[Khaya AI] Skipping translation: empty input text.');
      return null;
    }

    const keys = this.getApiKeys();
    for (const key of keys) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`${this.baseUrl}/v2/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': key
          },
          body: JSON.stringify({
            in: cleanText,
            lang: langPair
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.text();
          let translatedText = result;
          try {
            const parsed = JSON.parse(result);
            if (typeof parsed === 'string') translatedText = parsed;
            else if (parsed && parsed.text) translatedText = parsed.text;
          } catch (e) {
            // Raw text response
          }

          console.log(`[Khaya AI] Translation v2 (${langPair}): "${translatedText}"`);
          return translatedText;
        } else {
          const errText = await response.text();
          console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... Translation Error HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... Translation request failed:`, err.message || err);
      }
    }

    return null;
  }

  /**
   * Synthesizes text into audio (Female voice throughout) using Khaya TTS API v2
   */
  static async synthesizeSpeech(options: KhayaTtsOptions): Promise<Buffer | null> {
    let cleanText = (options.text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    // 1. Guard against EMPTY_TEXT (Khaya API returning 400 Bad Request on empty strings)
    if (!cleanText || !cleanText.length) {
      console.warn('[Khaya AI] Skipping TTS synthesis: empty or whitespace text.');
      return null;
    }

    // Cut short loading time: truncate long text to 180 chars or first complete sentence
    if (cleanText.length > 180) {
      const match = cleanText.slice(0, 180).match(/[\s\S]*[.!?]/);
      cleanText = match ? match[0] : cleanText.slice(0, 180);
    }

    const language = options.language || 'twi';
    const speakerId = options.speaker_id || options.speaker || 'female';
    const outputFormat = options.format || options.output_format || 'mp3';

    // 2. High-speed TTS memory cache
    const cacheKey = `${language}:${speakerId}:${cleanText}`;
    if (this.ttsCache.has(cacheKey)) {
      console.log(`[Khaya AI] TTS Cache Hit for "${cleanText.slice(0, 25)}..." (${speakerId})`);
      return this.ttsCache.get(cacheKey)!;
    }

    const keys = this.getApiKeys();

    for (const key of keys) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${this.baseUrl}/tts/v2/synthesize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': key
          },
          body: JSON.stringify({
            text: cleanText,
            language,
            speaker_id: speakerId,
            speaker: speakerId,
            stream: false,
            format: outputFormat
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length > 200) {
            console.log(`[Khaya AI] Synthesized TTS v2 (${language}, female voice) (${buffer.length} bytes)`);
            if (this.ttsCache.size > 100) this.ttsCache.clear();
            this.ttsCache.set(cacheKey, buffer);
            return buffer;
          }
        } else {
          const errText = await response.text();
          console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... TTS v2 Error HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... TTS v2 request failed:`, err.message || err);
      }
    }

    return null;
  }

  /**
   * Transcribes Ghanaian audio into text using Khaya Automatic Speech Recognition API v3
   */
  static async transcribeAudio(audioBuffer: Buffer, language: string = 'twi'): Promise<string | null> {
    if (!audioBuffer || audioBuffer.length < 300) return null;

    const targetLang = (language === 'tw' || language === 'twi' || language === 'ak') ? 'twi' : 'eng';
    const keys = this.getApiKeys();

    for (const key of keys) {
      try {
        const url = `${this.baseUrl}/asr/v3/transcribe?language=${encodeURIComponent(targetLang)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'audio/wav',
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': key
          },
          body: audioBuffer
        });

        if (response.ok) {
          const rawText = await response.text();
          let resultText = rawText;
          try {
            const json = JSON.parse(rawText);
            if (json && json.text) {
              resultText = json.text;
            }
          } catch (e) {
            // Raw text response
          }

          console.log(`[Khaya AI] ASR v3 Transcription (${targetLang}): "${resultText}"`);
          return resultText;
        } else {
          const errText = await response.text();
          console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... ASR v3 Error HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[Khaya AI] Key ${key.slice(0, 8)}... ASR v3 request failed:`, err.message || err);
      }
    }

    return null;
  }

  /**
   * Fetches supported languages catalog for ASR API v3 (GET https://translation-api.ghananlp.org/asr/v3/languages)
   */
  static async getAsrLanguages(): Promise<any> {
    const keys = this.getApiKeys();
    for (const key of keys) {
      try {
        const response = await fetch(`${this.baseUrl}/asr/v3/languages`, {
          headers: { 'Ocp-Apim-Subscription-Key': key }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e: any) {
        console.warn('[Khaya AI] Error fetching ASR languages:', e.message);
      }
    }
    return null;
  }

  /**
   * Fetches available speakers catalog for TTS API v2 (GET https://translation-api.ghananlp.org/tts/v2/speakers)
   */
  static async getTtsSpeakers(): Promise<any> {
    const keys = this.getApiKeys();
    for (const key of keys) {
      try {
        const response = await fetch(`${this.baseUrl}/tts/v2/speakers`, {
          headers: { 'Ocp-Apim-Subscription-Key': key }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e: any) {
        console.warn('[Khaya AI] Error fetching TTS speakers:', e.message);
      }
    }
    return null;
  }

  /**
   * Fetches supported languages catalog for Translation API v2 (GET https://translation-api.ghananlp.org/v2/languages)
   */
  static async getTranslationLanguages(): Promise<any> {
    const keys = this.getApiKeys();
    for (const key of keys) {
      try {
        const response = await fetch(`${this.baseUrl}/v2/languages`, {
          headers: { 'Ocp-Apim-Subscription-Key': key }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e: any) {
        console.warn('[Khaya AI] Error fetching Translation languages:', e.message);
      }
    }
    return null;
  }
}
