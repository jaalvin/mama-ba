import { Router, Request, Response } from 'express';
import { RAGChatService } from '../services/ragChatService';
import { MmsTtsService } from '../services/mmsTtsService';
import { KhayaAiService } from '../services/khayaAiService';

const router = Router();

// POST /api/v1/chat/query
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, query, language } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query string is required' });
    }
    const result = await RAGChatService.processQuery({
      userId: userId || 'demo-patient-001',
      query,
      language: language || 'twi'
    });
    res.json({ success: true, data: result });
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

// POST /api/v1/chat/asr (Khaya AI Automatic Speech Recognition API v3)
router.post('/asr', async (req: Request, res: Response) => {
  try {
    const { audio_base64, language } = req.body;
    let audioBuffer: Buffer | null = null;

    if (audio_base64) {
      const cleanBase64 = audio_base64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      audioBuffer = req.body;
    }

    if (!audioBuffer || audioBuffer.length < 500) {
      return res.json({
        success: false,
        error: 'Audio recording too short or empty. Please speak for 2-3 seconds.'
      });
    }

    // Khaya AI ASR v3 (Transcribes Ghanaian and African languages)
    const targetLang = (language === 'twi' || language === 'tw' || language === 'twi-only' || language === 'ak') ? 'twi' : 'eng';
    const khayaTranscription = await KhayaAiService.transcribeAudio(audioBuffer, targetLang);

    if (khayaTranscription && khayaTranscription.trim()) {
      return res.json({
        success: true,
        transcription: khayaTranscription.trim()
      });
    }

    return res.json({
      success: false,
      error: 'Twi voice not clearly recognized. Please speak closer to microphone.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/tts (Khaya AI Text-To-Speech API v2 - Female Voice)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, speaker_id, speaker } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'text is required and must not be empty' });
    }

    const targetLang = (language || 'tw').toLowerCase();
    const isTwi = targetLang === 'tw' || targetLang === 'twi' || targetLang === 'ak';
    const khayaLang = isTwi ? 'twi' : 'eng';
    const speakerId = speaker_id || speaker || 'female';

    // 1. Primary Ghanaian Neural TTS: Khaya AI TTS API v2 (Female Voice)
    const khayaBuffer = await KhayaAiService.synthesizeSpeech({
      text,
      language: khayaLang,
      speaker_id: speakerId
    });

    if (khayaBuffer && khayaBuffer.length > 100) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', khayaBuffer.length);
      return res.send(khayaBuffer);
    }

    // 2. Secondary Neural TTS Fallback: Meta MMS Akan or Cloud Speech Pipeline
    const mmsBuffer = await MmsTtsService.synthesizeTwiAudio(text);
    if (mmsBuffer && mmsBuffer.length > 100) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', mmsBuffer.length);
      return res.send(mmsBuffer);
    }

    const fallbackBuffer = await MmsTtsService.synthesizeFallbackAudio(text);
    if (fallbackBuffer && fallbackBuffer.length > 100) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', fallbackBuffer.length);
      return res.send(fallbackBuffer);
    }

    res.status(500).json({ success: false, error: 'TTS synthesis unavailable' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/chat/history/:userId
router.get('/history/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = RAGChatService.getChatHistory(userId || 'demo-patient-001');
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
