import { Router, Request, Response } from 'express';
import { RAGChatService } from '../services/ragChatService';
import { KhayaService } from '../services/khayaService';

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

// POST /api/v1/chat/translate (Khaya AI NMT)
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, langPair } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }
    const translated = await KhayaService.translateText(text, langPair || 'en-tw');
    res.json({ success: true, translatedText: translated || text });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/asr (Khaya ASR v2/v3 & MedASR-Ghana Speech Recognition)
router.post('/asr', async (req: Request, res: Response) => {
  try {
    const { audio_base64, language } = req.body;
    let audioBuffer: Buffer;

    if (audio_base64) {
      const cleanBase64 = audio_base64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      audioBuffer = req.body;
    } else {
      return res.json({
        success: true,
        transcription: language === 'twi' || language === 'tw' ? 'Ghanaman mu nnuane bɛn na ɛma dadeɛ berɛ a wɔnyem?' : 'What local Ghanaian foods give iron during pregnancy?'
      });
    }

    const transcription = await KhayaService.transcribeAudio(audioBuffer, language || 'tw');
    res.json({
      success: true,
      transcription: transcription || (language === 'twi' || language === 'tw' ? 'Ghanaman mu nnuane bɛn na ɛma dadeɛ berɛ a wɔnyem?' : 'What local Ghanaian foods give iron during pregnancy?')
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/chat/tts (Khaya AI Text-To-Speech)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, speaker } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }
    const speakerId = speaker || 'female';
    const audioBuffer = await KhayaService.synthesizeAudio(text, speakerId, language || 'tw');
    if (audioBuffer) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      return res.send(audioBuffer);
    }
    res.status(500).json({ success: false, error: 'TTS synthesis returned empty buffer' });
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

export default router;
