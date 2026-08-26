import { CONFIG } from '../config';

export class KhayaService {
  private static apiKey = CONFIG.KHAYA_API_KEY || process.env.KHAYA_API_KEY || '';
  private static baseUrl = (CONFIG.KHAYA_API_BASE_URL || 'https://translation-api.ghananlp.org').replace(/\/+$/, '');

  /**
   * Translates single or multi-sentence text with sentence-splitting to avoid NMT truncation.
   * langPair: 'en-tw' | 'tw-en'
   */
  static async translateText(text: string, langPair: 'en-tw' | 'tw-en' = 'en-tw'): Promise<string | null> {
    if (!this.apiKey || !text || text.trim().length === 0) return null;

    const cleanInput = text.trim();

    // If text has multiple sentences, split and translate each individually for maximum NMT accuracy
    const sentences = cleanInput.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanInput];

    if (sentences.length > 1) {
      const translatedChunks: string[] = [];
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 0) {
          const chunkTranslation = await this.translateSingleSentence(trimmed, langPair);
          translatedChunks.push(chunkTranslation || trimmed);
        }
      }
      return translatedChunks.join(' ');
    }

    return await this.translateSingleSentence(cleanInput, langPair);
  }

  private static async translateSingleSentence(sentence: string, langPair: 'en-tw' | 'tw-en'): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`${this.baseUrl}/v1/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          in: sentence,
          lang: langPair
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[KhayaService] HTTP ${response.status} on sentence: "${sentence.slice(0, 30)}..."`);
        return null;
      }

      const data = await response.json();

      // Handle raw string response
      if (typeof data === 'string') return data.trim();

      // Handle object response { out: "...", text: "...", translation: "..." }
      if (data && typeof data === 'object') {
        const obj = data as any;
        const result = obj.out || obj.text || obj.translatedText || obj.translation;
        if (result && typeof result === 'string') {
          return result.trim();
        }
        if (obj.message || obj.error) {
          console.warn('[KhayaService] API Error notice:', obj.message || obj.error);
        }
      }

      return null;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[KhayaService] Translation request error:', err.message || err);
      }
      return null;
    }
  }

  /**
   * Synthesize Ghanaian Twi audio with Khaya TTS API
   */
  static async synthesizeAudio(text: string, speaker: 'female' | 'male_low' | 'male_high' = 'female', langCode: string = 'tw'): Promise<Buffer | null> {
    if (!this.apiKey || !text) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.baseUrl}/tts/v2/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        body: JSON.stringify({
          text: text.slice(0, 300), // Protect against TTS buffer limits
          language: langCode || 'tw',
          speaker_id: speaker
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Fallback to TTS v1 endpoint if v2 is busy
      const fallbackRes = await fetch(`${this.baseUrl}/tts/v1/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        body: JSON.stringify({ text: text.slice(0, 300), language: langCode || 'tw' })
      });

      if (fallbackRes.ok) {
        const arrayBuffer = await fallbackRes.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      return null;
    } catch (err) {
      console.warn('[KhayaService] TTS synthesis notice:', err);
      return null;
    }
  }

  /**
   * Transcribe audio with Khaya ASR API
   */
  static async transcribeAudio(audioBuffer: Buffer, languageCode: string = 'tw'): Promise<string | null> {
    if (!this.apiKey || !audioBuffer) return null;
    try {
      const response = await fetch(`${this.baseUrl}/asr/v1/transcribe?language=${encodeURIComponent(languageCode)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        body: audioBuffer
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (typeof data === 'string') return data.trim();
      const obj = data as any;
      return obj.text || obj.transcription || obj.out || null;
    } catch (err) {
      console.warn('[KhayaService] ASR notice:', err);
      return null;
    }
  }
}
