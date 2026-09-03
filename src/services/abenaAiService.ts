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
      process.env.ABENA_KEY_1 || CONFIG.ABENA_KEY_1 || 'sk_99e14864877b47f7a121313b87602aec',
      process.env.ABENA_KEY_2 || CONFIG.ABENA_KEY_2 || 'sk_23d2b9e5b24c4ab7ae82bc2dc105491c',
      process.env.ABENA_KEY_3 || CONFIG.ABENA_KEY_3 || 'sk_5565023c4fe143f99801f0253823ad0f',
      process.env.ABENA_KEY_4 || CONFIG.ABENA_KEY_4 || 'sk_cc319643c820440d9fa26e94be26e140',
      process.env.ABENA_KEY_5 || CONFIG.ABENA_KEY_5 || 'sk_b66230787fc54e8ba63b3084a7370521',
      process.env.ABENA_KEY_6 || CONFIG.ABENA_KEY_6 || 'sk_a47fce0855e54740887c863fa268e423',
      process.env.ABENA_KEY_7 || CONFIG.ABENA_KEY_7 || 'sk_b18d6bafae8a4160bbfc8639a593051e',
      process.env.ABENA_KEY_8 || CONFIG.ABENA_KEY_8 || 'sk_062ac4b25cc44479b6eda14e4a0f1f7d',
      process.env.ABENA_API_KEY || CONFIG.ABENA_API_KEY || '',
      process.env.ABENA_FALLBACK_API_KEY || CONFIG.ABENA_FALLBACK_API_KEY || ''
    ].filter(k => k && k.length > 5);

    const uniqueKeys: (string | null)[] = [...new Set(rawKeys)];
    // Append null as the final Abena tier to attempt anonymous call (IP-based free tier)
    uniqueKeys.push(null);
    return uniqueKeys;
  }

  private static ttsMemoryCache = new Map<string, Buffer>();
  private static exhaustedKeys = new Set<string>();

  /**
   * Synthesizes text into high-quality fluent Ghanaian speech (Twi or Ghanaian English WAV)
   * Cycles through all 8 Abena AI API keys before any fallback.
   * Note: Initial model warm-up can take up to ~15s, so timeout is set to 20s.
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
    // If all keys were previously marked exhausted, reset for a fresh attempt
    if (this.exhaustedKeys.size >= keyPool.length - 1) {
      this.exhaustedKeys.clear();
    }

    console.log(`[Abena AI TTS] Attempting synthesis across all ${keyPool.length - 1} Abena AI keys for voice "${voice}"...`);

    for (let idx = 0; idx < keyPool.length; idx++) {
      const key = keyPool[idx];
      if (key && this.exhaustedKeys.has(key)) {
        continue; // Skip temporarily rate-limited keys
      }

      const keyLabel = key ? `Key ${idx + 1}/${keyPool.length - 1} (${key.slice(0, 8)}...)` : `Anonymous Tier`;

      try {
        // Abena AI models can take ~10-25s to warm up on initial call, so set timeout to 40,000ms (40s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
          headers['X-API-Key'] = key;
        }

        console.log(`[Abena AI TTS] Requesting ${keyLabel}...`);
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
          console.warn(`[Abena AI] ${keyLabel} quota/rate limit exhausted (HTTP ${response.status}): ${errText}. Rotating to next key...`);
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[Abena AI] ${keyLabel} TTS Error HTTP ${response.status}: ${errText}. Rotating to next key...`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] ${keyLabel} TTS request notice:`, err.message || err);
      }
    }

    console.warn('[Abena AI] All 8 Abena keys and anonymous tier exhausted for TTS synthesis.');
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
