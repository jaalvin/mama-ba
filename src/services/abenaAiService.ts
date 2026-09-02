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

  private static getApiKeys(): string[] {
    const keys = [
      process.env.ABENA_API_KEY || CONFIG.ABENA_API_KEY || '',
      process.env.ABENA_FALLBACK_API_KEY || CONFIG.ABENA_FALLBACK_API_KEY || '',
      'sk_b7eea9292472403bb750eb04b3d0ca58',
      'sk_f4a76e3af8634e02ae1749da5082b02f'
    ].filter(k => k && k.length > 5);

    return [...new Set(keys)];
  }

  /**
   * Synthesizes text into high-quality fluent Ghanaian speech (Twi or Ghanaian English WAV)
   */
  static async synthesizeSpeech(options: TtsOptions): Promise<Buffer | null> {
    let cleanText = options.text
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return null;

    // Truncate at sentence boundary to max ~200 chars for ultra-fast speech synthesis
    if (cleanText.length > 200) {
      const match = cleanText.slice(0, 200).match(/[\s\S]*[.!?]/);
      cleanText = match ? match[0] : cleanText.slice(0, 200);
    }

    const voice = options.voice || 'abena_twi_high';
    const speed = options.speed || 1.05;
    const keys = this.getApiKeys();

    for (const key of keys) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`${this.baseUrl}/tts/synthesize/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'X-API-Key': key
          },
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
            console.log(`[Abena AI] Synthesized ${voice} audio (${buffer.length} bytes WAV, ${json.duration_seconds || 0}s)`);
            return buffer;
          }
        } else {
          const errText = await response.text();
          console.warn(`[Abena AI] Key ${key.slice(0, 8)}... TTS Error HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] Key ${key.slice(0, 8)}... TTS request failed:`, err.message || err);
      }
    }

    return null;
  }

  /**
   * Transcribes Ghanaian audio into Twi / English text using Abena ASR engine
   */
  static async transcribeAudio(audioBuffer: Buffer, language: string = 'twi-only'): Promise<string | null> {
    if (!audioBuffer || audioBuffer.length < 500) return null;

    const targetLang = (language === 'twi' || language === 'tw' || language === 'twi-only' || language === 'ak') ? 'twi-only' : 'twi-en';
    const keys = this.getApiKeys();

    for (const key of keys) {
      try {
        const boundary = '----AbenaBoundary' + Date.now();
        const langHeader = `Content-Disposition: form-data; name="language"\r\n\r\n${targetLang}\r\n`;
        const fileHeader = `Content-Disposition: form-data; name="audio_file"; filename="speech.wav"\r\nContent-Type: audio/wav\r\n\r\n`;

        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\n${langHeader}--${boundary}\r\n${fileHeader}`),
          audioBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const response = await fetch(`${this.baseUrl}/asr/transcribe/`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Authorization': `Bearer ${key}`,
            'X-API-Key': key
          },
          body: payload
        });

        if (response.ok) {
          const json = (await response.json()) as AbenaAsrResponse;
          if (json && (json.transcription || json.text)) {
            const resultText = json.transcription || json.text || '';
            console.log(`[Abena AI] ASR Transcription: "${resultText}"`);
            return resultText;
          }
        } else {
          const errText = await response.text();
          console.warn(`[Abena AI] Key ${key.slice(0, 8)}... ASR Error HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[Abena AI] Key ${key.slice(0, 8)}... ASR request failed:`, err.message || err);
      }
    }

    return null;
  }
}
