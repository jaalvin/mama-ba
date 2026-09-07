import { Router, Request, Response } from 'express';
import { RAGChatService } from '../services/ragChatService';
import { MmsTtsService } from '../services/mmsTtsService';
import { KhayaAiService } from '../services/khayaAiService';
import { AbenaAiService } from '../services/abenaAiService';

const router = Router();

// POST /api/v1/chat/query
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, query, language, sessionMemory } = req.body;
    const activeUserId = (req.headers['x-user-id'] as string) || userId || 'anonymous-user';

    if (!query) {
      return res.status(400).json({ success: false, error: 'query string is required' });
    }
    const result = await RAGChatService.processQuery({
      userId: activeUserId,
      query,
      language: language || 'twi',
      sessionMemory
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/history/:userId?
router.get('/history/:userId?', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.userId || (req.headers['x-user-id'] as string) || (req.query.userId as string);
    if (!targetUserId) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const history = await RAGChatService.getChatHistory(targetUserId);
    res.json({ success: true, count: history.length, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/translate (Khaya AI Translation API v2)
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, langPair } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }
    const translatedText = await KhayaAiService.translateText(text, langPair || 'en-tw');
    res.json({ success: true, translatedText: translatedText || text });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/asr (Primary Khaya AI ASR v3 -> Abena AI ASR Fallback)
router.post('/asr', async (req: Request, res: Response) => {
  try {
    const { audio_base64, language } = req.body;
    let audioBuffer: Buffer | null = null;

    if (audio_base64) {
      const cleanBase64 = audio_base64.replace(/^data:[^;]+(;codecs=[^;]+)?;base64,/, '').replace(/^data:.*?;base64,/, '');
      audioBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      audioBuffer = req.body;
    }

    if (!audioBuffer || audioBuffer.length < 20) {
      return res.json({
        success: false,
        error: 'Audio recording too short or empty. Please try speaking again.'
      });
    }

    const reqLang = (language || 'twi').toLowerCase();
    const isEng = reqLang === 'en' || reqLang === 'eng' || reqLang === 'english';
    const khayaLang = isEng ? 'eng' : 'twi';
    const abenaLang = isEng ? 'en' : 'twi-en';

    // 1. PRIMARY ASR: Khaya AI ASR Engine (Preserves Abena AI credits for TTS)
    const khayaTranscription = await KhayaAiService.transcribeAudio(audioBuffer, khayaLang);
    if (khayaTranscription && khayaTranscription.trim()) {
      console.log(`[ASR Router] Transcribed via Khaya AI ASR Primary (${khayaLang}): "${khayaTranscription.trim()}"`);
      return res.json({
        success: true,
        transcription: khayaTranscription.trim(),
        provider: 'khaya_ai'
      });
    }

    // 2. FALLBACK ASR: Abena AI ASR Engine
    console.log('[ASR Router] Khaya AI ASR produced no result. Falling back to Abena AI ASR...');
    const abenaTranscription = await AbenaAiService.transcribeAudio(audioBuffer, abenaLang);
    if (abenaTranscription && abenaTranscription.trim()) {
      console.log(`[ASR Router] Transcribed via Abena AI ASR Fallback (${abenaLang}): "${abenaTranscription.trim()}"`);
      return res.json({
        success: true,
        transcription: abenaTranscription.trim(),
        provider: 'abena_ai'
      });
    }

    return res.json({
      success: false,
      language: isEng ? 'english' : 'twi',
      fallbackToBrowser: isEng,
      error: isEng
        ? 'English voice not recognized via cloud ASR. Please speak again or use keyboard.'
        : 'Twi voice not clearly recognized. Please speak closer to the microphone.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/tts (Primary Abena AI TTS -> Twi: Khaya AI TTS, English: Browser Default Fallback)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, voice } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'text is required and must not be empty' });
    }

    const targetLang = (language || 'tw').toLowerCase();
    const isTwi = targetLang === 'tw' || targetLang === 'twi' || targetLang === 'ak' || targetLang === 'akan';
    const preferredVoice = voice || (isTwi ? 'abena_twi_high' : 'akua_eng');

    // 1. PRIMARY TTS: Abena AI Neural TTS Engine (Ghanaian English & Twi)
    let abenaBuffer = await AbenaAiService.synthesizeSpeech({
      text,
      voice: preferredVoice
    });

    if (abenaBuffer && abenaBuffer.length > 100) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', abenaBuffer.length);
      res.setHeader('X-Speech-Provider', 'Abena AI');
      return res.send(abenaBuffer);
    }

    // 2. FALLBACK for Twi ONLY: Khaya AI TTS Engine (Female Ghanaian Twi Voice)
    if (isTwi) {
      console.log('[TTS Router] Abena AI TTS unavailable. Falling back to Khaya AI TTS for Twi...');
      const khayaBuffer = await KhayaAiService.synthesizeSpeech({
        text,
        language: 'twi',
        speaker_id: 'female'
      });

      if (khayaBuffer && khayaBuffer.length > 100) {
        res.setHeader('Content-Type', 'audio/mp3');
        res.setHeader('Content-Length', khayaBuffer.length);
        res.setHeader('X-Speech-Provider', 'Khaya AI');
        return res.send(khayaBuffer);
      }
    }

    // 3. FALLBACK for English or if both Twi cloud engines fail: Browser Default Speech
    console.warn(`[TTS Router] Cloud TTS unavailable for ${isTwi ? 'Twi' : 'English'}. Signaling browser fallback.`);
    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      language: isTwi ? 'twi' : 'english',
      message: 'Cloud TTS unavailable. Using browser default speech synthesis.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/history/:userId
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = await RAGChatService.getChatHistory(userId || 'demo-patient-001');
    res.json({ success: true, count: history.length, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/preset-cards
router.get('/preset-cards', (_req: Request, res: Response) => {
  try {
    const cards = RAGChatService.getPresetPromptCards();
    res.json({ success: true, count: cards.length, data: cards });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/asr/languages (Khaya ASR v3 Supported Languages Catalog)
router.get('/asr/languages', async (_req: Request, res: Response) => {
  try {
    const catalog = await KhayaAiService.getAsrLanguages();
    res.json({ success: true, data: catalog });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/tts/speakers (Khaya TTS v2 Speakers Catalog)
router.get('/tts/speakers', async (_req: Request, res: Response) => {
  try {
    const catalog = await KhayaAiService.getTtsSpeakers();
    res.json({ success: true, data: catalog });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/translate/languages (Khaya Translation v2 Supported Languages Catalog)
router.get('/translate/languages', async (_req: Request, res: Response) => {
  try {
    const catalog = await KhayaAiService.getTranslationLanguages();
    res.json({ success: true, data: catalog });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
