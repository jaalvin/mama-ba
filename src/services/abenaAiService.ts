import dotenv from 'dotenv';
import { CONFIG } from '../config';
dotenv.config();

export interface TtsOptions {
  text: string;
  voice?: 'abena_twi_high' | 'abena_twi_lite' | 'akua_eng' | 'kwabena_eng' | 'kobby_gpe' | string;
  speed?: number;
}

export interface AbenaTtsResponse {
  status?: string;
  voice?: string;
  audio_base64?: string;
  duration_seconds?: number;
  message?: string;
}

export interface AbenaAsrResponse {
  text?: string;
  transcription?: string;
  language?: string;
  error?: string;
}

export class AbenaAiService {
  private static baseUrl = process.env.ABENA_API_BASE_URL || CONFIG.ABENA_API_BASE_URL || 'https://abena.mobobi.com/playground/api/v1';

  private static getApiKeys(): (string | null)[] {
    const rawKeys = [
      process.env.ABENA_KEY_1 || CONFIG.ABENA_KEY_1 || 'sk_665b78f24cb24ccab5439a267fc20d71',
      process.env.ABENA_KEY_2 || CONFIG.ABENA_KEY_2 || 'sk_bf28e7963f0b46ff8a3d04503b3ef15f',
      process.env.ABENA_KEY_3 || CONFIG.ABENA_KEY_3 || 'sk_6cbd8b6200b1495a8c99917e146b7bc4',
      process.env.ABENA_KEY_4 || CONFIG.ABENA_KEY_4 || 'sk_8386b2043ef1415aa8f36e40f959cc5f',
      process.env.ABENA_KEY_5 || CONFIG.ABENA_KEY_5 || 'sk_e2812cf49744446f9377040095eebecc',
      process.env.ABENA_KEY_6 || CONFIG.ABENA_KEY_6 || 'sk_f43c5bf516e84e038f7b955f77d667bd',
      process.env.ABENA_KEY_7 || CONFIG.ABENA_KEY_7 || 'sk_d953bf290d394798baa9882dc82d95f5',
      process.env.ABENA_KEY_8 || CONFIG.ABENA_KEY_8 || 'sk_6e293b7a2f92431a85a40814a211abcb',
      process.env.ABENA_KEY_9 || CONFIG.ABENA_KEY_9 || 'sk_48aa846f571a4786a04e363a8cd4ac22',
      process.env.ABENA_KEY_10 || CONFIG.ABENA_KEY_10 || 'sk_da1bc3b2bbf340dd8d6482dacccf4e52',
      process.env.ABENA_KEY_11 || CONFIG.ABENA_KEY_11 || 'sk_7b0d216cd3d64d288d05833a06930082',
      process.env.ABENA_KEY_12 || CONFIG.ABENA_KEY_12 || 'sk_8c58e1df8a6c43dfb7f890524e0c4158',
      process.env.ABENA_API_KEY || CONFIG.ABENA_API_KEY || 'sk_665b78f24cb24ccab5439a267fc20d71',
      process.env.ABENA_FALLBACK_API_KEY || CONFIG.ABENA_FALLBACK_API_KEY || 'sk_bf28e7963f0b46ff8a3d04503b3ef15f',
      null // Anonymous Free Tier as final fallback
    ];

    const uniqueKeys: (string | null)[] = [...new Set(rawKeys.filter(k => k === null || (typeof k === 'string' && k.length > 5)))];
    return uniqueKeys;
  }

  private static ttsMemoryCache = new Map<string, Buffer>();
  private static exhaustedKeys = new Set<string>();

  /**
   * Synthesizes text into high-quality fluent Ghanaian speech (Twi or Ghanaian English WAV)
   * Prioritizes instant Anonymous Tier and rotates through API keys.
   */
  static async synthesizeSpeech(options: TtsOptions): Promise<Buffer | null> {
    let cleanText = options.text
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return null;

    // Keep full response text for TTS reading (up to 500 chars per Abena API spec)
    if (cleanText.length > 500) {
      const match = cleanText.slice(0, 500).match(/^[\s\S]*[.!?]/);
      cleanText = match ? match[0] : cleanText.slice(0, 500);
    }

    const voice = options.voice || 'abena_twi_high';
    const speed = options.speed || 1.0;

    // 1. Check In-Memory TTS Cache for instant (0ms) response
    const cacheKey = `${voice}:${cleanText.toLowerCase()}`;
    if (this.ttsMemoryCache.has(cacheKey)) {
      const cachedBuffer = this.ttsMemoryCache.get(cacheKey)!;
      console.log(`[Abena AI Cache Hit] Served ${voice} audio from memory (0ms delay, ${cachedBuffer.length} bytes)`);
      return cachedBuffer;
    }

    const keyPool = this.getApiKeys();
    console.log(`[Abena AI TTS] Attempting synthesis for voice "${voice}"...`);

    for (let idx = 0; idx < keyPool.length; idx++) {
      const key = keyPool[idx];
      if (key && this.exhaustedKeys.has(key)) {
        continue; // Skip keys marked exhausted
      }

      const keyLabel = key ? `Key ${idx} (${key.slice(0, 8)}...)` : `Anonymous Free Tier`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
        }

        console.log(`[Abena AI TTS] Requesting via ${keyLabel}...`);
        const response = await fetch(`${this.baseUrl}/tts/synthesize/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: cleanText,
            voice,
            speed
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = (await response.json()) as AbenaTtsResponse;
          if (json && json.status === 'success' && json.audio_base64) {
            const buffer = Buffer.from(json.audio_base64, 'base64');
            console.log(`[Abena AI SUCCESS] Synthesized ${voice} audio via ${keyLabel} (${buffer.length} bytes WAV, ${json.duration_seconds || 0}s)`);
            
            if (this.ttsMemoryCache.size > 250) {
              const firstKey = this.ttsMemoryCache.keys().next().value;
              if (firstKey) this.ttsMemoryCache.delete(firstKey);
            }
            this.ttsMemoryCache.set(cacheKey, buffer);
            return buffer;
          }
        } else if (response.status === 402 || response.status === 429) {
          if (key) this.exhaustedKeys.add(key);
          const errText = await response.text().catch(() => '');
          console.warn(`[Abena AI] ${keyLabel} limit notice (HTTP ${response.status}): ${errText}. Rotating...`);
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[Abena AI] ${keyLabel} TTS Error HTTP ${response.status}: ${errText}. Rotating...`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] ${keyLabel} TTS request notice:`, err.message || err);
      }
    }

    console.warn('[Abena AI] All Abena tiers exhausted for TTS synthesis.');
    return null;
  }

  /**
   * Transcribes Ghanaian audio into Twi / English text using Abena ASR engine
   * Cycles through all 8 Abena AI API keys before any fallback.
   */
  static async transcribeAudio(audioBuffer: Buffer, language: string = 'twi-en'): Promise<string | null> {
    if (!audioBuffer || audioBuffer.length < 300) return null;

    // Use twi-en by default for Twi, English, or Twi-English code-switching as recommended by Abena AI docs
    const targetLang = (language === 'twi-only' || language === 'twi_only') ? 'twi-only' : (language === 'en' || language === 'english') ? 'en' : 'twi-en';
    const keyPool = this.getApiKeys();

    console.log(`[Abena AI ASR] Attempting transcription across ${keyPool.length - 1} Abena AI keys (language: ${targetLang})...`);

    for (let idx = 0; idx < keyPool.length; idx++) {
      const key = keyPool[idx];
      const keyLabel = key ? `Key ${idx + 1} (${key.slice(0, 8)}...)` : `Anonymous Tier`;

      try {
        const boundary = '----AbenaBoundary' + Date.now();
        const langHeader = `Content-Disposition: form-data; name="language"\r\n\r\n${targetLang}\r\n`;
        const fileHeader = `Content-Disposition: form-data; name="audio_file"; filename="speech.wav"\r\nContent-Type: audio/wav\r\n\r\n`;

        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\n${langHeader}--${boundary}\r\n${fileHeader}`),
          audioBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const headers: Record<string, string> = {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        };

        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
          headers['X-API-Key'] = key;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for ASR

        const response = await fetch(`${this.baseUrl}/asr/transcribe/`, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = (await response.json()) as AbenaAsrResponse;
          if (json && (json.transcription || json.text)) {
            const resultText = json.transcription || json.text || '';
            console.log(`[Abena AI ASR SUCCESS] Transcription via ${keyLabel}: "${resultText}"`);
            return resultText;
          }
        } else if (response.status === 402 || response.status === 429) {
          const errText = await response.text().catch(() => '');
          console.warn(`[Abena AI] ${keyLabel} ASR quota/rate limit exhausted (HTTP ${response.status}): ${errText}. Rotating to next key...`);
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[Abena AI] ${keyLabel} ASR Error HTTP ${response.status}: ${errText}. Rotating to next key...`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] ${keyLabel} ASR request failed:`, err.message || err);
      }
    }

    console.warn('[Abena AI] All 8 Abena keys and anonymous tier exhausted for ASR transcription.');
    return null;
  }
}
