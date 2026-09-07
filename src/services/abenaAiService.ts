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
      process.env.ABENA_KEY_1 || CONFIG.ABENA_KEY_1 || 'sk_dd2ff64591ce480dab9a23db4388b7e3',
      process.env.ABENA_KEY_2 || CONFIG.ABENA_KEY_2 || 'sk_97455e7a1c014464b09fc104546c3bcb',
      process.env.ABENA_KEY_3 || CONFIG.ABENA_KEY_3 || 'sk_d953bf290d394798baa9882dc82d95f5',
      process.env.ABENA_KEY_4 || CONFIG.ABENA_KEY_4 || 'sk_6e293b7a2f92431a85a40814a211abcb',
      process.env.ABENA_API_KEY || CONFIG.ABENA_API_KEY || 'sk_dd2ff64591ce480dab9a23db4388b7e3',
      process.env.ABENA_FALLBACK_API_KEY || CONFIG.ABENA_FALLBACK_API_KEY || 'sk_97455e7a1c014464b09fc104546c3bcb',
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
    const primaryBuffer = await this.synthesizeSpeechSingle(options);
    if (primaryBuffer) return primaryBuffer;

    // Automatic Voice Fallback: If requested voice timed out or failed, try secondary voice immediately
    const requestedVoice = options.voice || 'abena_twi_high';
    if (requestedVoice.includes('twi')) {
      const fallbackVoice = requestedVoice === 'abena_twi_lite' ? 'abena_twi_high' : 'abena_twi_lite';
      console.log(`[Abena AI TTS] Fallback to Twi voice "${fallbackVoice}" for rapid synthesis...`);
      return this.synthesizeSpeechSingle({ ...options, voice: fallbackVoice });
    } else if (requestedVoice === 'akua_eng') {
      console.log(`[Abena AI TTS] Fallback to English voice "kwabena_eng"...`);
      return this.synthesizeSpeechSingle({ ...options, voice: 'kwabena_eng' });
    }

    return null;
  }

  private static async synthesizeSpeechSingle(options: TtsOptions): Promise<Buffer | null> {
    let cleanText = options.text
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~•\-–—]/g, ' ')
      .replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return null;

    // Cap text to first ~180 characters (or 2 sentences) for ultra low-latency synthesis (<1.5s)
    if (cleanText.length > 180) {
      const match = cleanText.slice(0, 180).match(/^[\s\S]*?[.!?](\s|$)/);
      cleanText = match ? match[0].trim() : cleanText.slice(0, 180).trim();
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
    console.log(`[Abena AI TTS] Synthesizing "${cleanText.slice(0, 40)}..." with voice "${voice}"...`);

    for (let idx = 0; idx < keyPool.length; idx++) {
      const key = keyPool[idx];

      const keyLabel = key ? `Key ${idx} (${key.slice(0, 8)}...)` : `Anonymous Free Tier`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s per-key timeout for neural TTS

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
        }

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
          console.warn(`[Abena AI] ${keyLabel} limit notice (HTTP ${response.status}). Rotating to next key...`);
        } else {
          console.warn(`[Abena AI] ${keyLabel} TTS Error HTTP ${response.status}. Rotating to next key...`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] ${keyLabel} TTS request timeout/error:`, err.message || err);
      }
    }

    console.warn(`[Abena AI] All Abena tiers exhausted for ${voice}.`);
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
