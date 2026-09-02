import dotenv from 'dotenv';
dotenv.config();

export class MmsTtsService {
  private static hfToken = process.env.HF_TOKEN || '';
  private static endpoints = [
    'https://router.huggingface.co/hf-inference/models/facebook/mms-tts-aka',
    'https://api-inference.huggingface.co/models/facebook/mms-tts-aka'
  ];

  /**
   * Synthesizes Akan/Twi text into audio buffer using Meta's MMS Twi model with Google TTS fallback
   */
  static async synthesizeTwiAudio(text: string): Promise<Buffer | null> {
    const token = process.env.HF_TOKEN || this.hfToken;
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return null;

    if (token) {
      for (const url of this.endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'x-use-cache': 'true'
            },
            body: JSON.stringify({ inputs: cleanText }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length > 100) {
              console.log(`[Meta-MMS] Successfully synthesized Twi TTS (${buffer.length} bytes WAV) via ${url}`);
              return buffer;
            }
          }
        } catch (err: any) {
          // Silently catch network failures per endpoint
        }
      }
    }

    console.log('[Meta-MMS] Primary endpoints offline, using Cloud TTS fallback audio pipeline...');
    return this.synthesizeFallbackAudio(cleanText);
  }

  /**
   * High reliability fallback TTS audio generator
   */
  static async synthesizeFallbackAudio(text: string, lang: string = 'en'): Promise<Buffer | null> {
    try {
      const q = encodeURIComponent(text.slice(0, 200));
      const isTwi = lang === 'twi' || lang === 'tw' || lang === 'ak';
      const targetLang = isTwi ? 'ak' : 'en';
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${q}&tl=${targetLang}&client=tw-ob`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 100) {
          console.log(`[Fallback TTS] Generated ${buffer.length} bytes MP3 audio (${targetLang})`);
          return buffer;
        }
      }
    } catch (e: any) {
      console.warn('[Fallback TTS] Error generating fallback audio:', e.message);
    }
    return null;
  }
}
