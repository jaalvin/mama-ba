/**
 * Speech Service:
 * 1. Encodes recorded mic audio to true 16kHz Mono PCM WAV before transmission.
 * 2. High-Quality Natural Human English (Microsoft Natural / Google Neural) Speech Synthesis.
 * 3. Twi Audio Playback via Khaya Neural TTS stream ONLY when Twi mode is selected.
 */

import { API } from './api.js';

// --- Resilient Client-Side 16kHz Mono WAV Converter ---
async function convertBlobTo16kHzWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Mix down to mono
  let monoData;
  if (audioBuffer.numberOfChannels > 1) {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    monoData = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      monoData[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    monoData = audioBuffer.getChannelData(0);
  }

  // Resample to 16,000 Hz if native sample rate differs
  const sourceRate = audioBuffer.sampleRate;
  const targetRate = 16000;
  let finalSamples = monoData;

  if (sourceRate !== targetRate) {
    const ratio = sourceRate / targetRate;
    const targetLength = Math.round(monoData.length / ratio);
    finalSamples = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      finalSamples[i] = monoData[srcIdx] || 0;
    }
  }

  // Encode 16-bit PCM WAV
  const wavBuffer = encodeWAV(finalSamples, targetRate);
  if (audioCtx.state !== 'closed') {
    await audioCtx.close();
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);           // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true);  // SampleRate (16000 Hz)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (16000 * 1 * 2)
  view.setUint16(32, 2, true);           // BlockAlign (1 * 2)
  view.setUint16(34, 16, true);          // BitsPerSample (16 bits)

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Float32 -> Int16 PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const SpeechService = {
  autoSpeak: true,
  voiceGender: 'female',
  speechRate: 0.94,
  speechPitch: 1.02,
  speakingUtterance: null,
  activeAudioElement: null,
  activeSpeakerBtn: null,
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  cachedVoices: [],

  initVoices() {
    if ('speechSynthesis' in window) {
      this.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  },

  /**
   * Select high-quality natural human clear English voice (Neural / Natural)
   */
  getDefaultEnglishVoice() {
    const voices = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
    if (!voices || voices.length === 0) return null;

    const isFemale = this.voiceGender === 'female';

    // 1. Priority 1: High-Definition Neural Natural voices (Microsoft Jenny/Aria/Guy/Christopher or Google Neural)
    let match = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isEnglish = lang.startsWith('en');
      const isNatural = name.includes('natural') || name.includes('online') || name.includes('neural') || name.includes('google');

      if (!isEnglish || !isNatural) return false;

      if (isFemale) {
        return name.includes('jenny') || name.includes('aria') || name.includes('ava') || name.includes('samantha') || name.includes('female') || !name.includes('guy');
      } else {
        return name.includes('guy') || name.includes('christopher') || name.includes('eric') || name.includes('george') || name.includes('male') || name.includes('david');
      }
    });

    if (match) return match;

    // 2. Priority 2: Any English voice matching gender preference (excluding robotic legacy SAPI5 voices if possible)
    match = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      if (!lang.startsWith('en')) return false;

      if (isFemale) {
        return name.includes('zira') || name.includes('samantha') || name.includes('hazel') || name.includes('female') || !name.includes('male');
      } else {
        return name.includes('david') || name.includes('mark') || name.includes('george') || name.includes('male');
      }
    });

    if (match) return match;

    // 3. Fallback: First available English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  },

  async startRecording(language = 'tw', onResultCallback = null, onErrorCallback = null) {
    this.stop();
    if (this.isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        const rawBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        let finalBlob = rawBlob;

        try {
          // Convert WebM/Opus into authentic 16kHz mono WAV
          finalBlob = await convertBlobTo16kHzWav(rawBlob);
        } catch (e) {
          console.warn('[SpeechService] WAV conversion notice, proceeding with raw blob:', e);
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Wav = reader.result;
          const res = await API.transcribeVoice({ audio_base64: base64Wav, language });
          if (res.success && res.transcription) {
            if (onResultCallback) onResultCallback(res.transcription);
          } else if (onErrorCallback) {
            onErrorCallback(res.error || 'Speech transcription failed');
          }
        };
        reader.readAsDataURL(finalBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      return true;
    } catch (err) {
      console.warn('[SpeechService] Recording error:', err);
      if (onErrorCallback) onErrorCallback('Microphone permission required.');
      return false;
    }
  },

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  },

  async speak(text, lang = 'english', onEndCallback = null, buttonElem = null) {
    this.stop();

    let cleanText = (text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return false;

    if (buttonElem) {
      this.activeSpeakerBtn = buttonElem;
      buttonElem.classList.add('speaking-active');
      buttonElem.innerHTML = `🔊 <em>${this.voiceGender === 'female' ? '👩' : '👨'} Speaking...</em>`;
    }

    // STRICT ISOLATION: Call Khaya AI Neural Audio ONLY when explicitly in Twi mode
    const isExplicitTwi = lang === 'twi' || lang === 'tw';

    if (isExplicitTwi) {
      try {
        const response = await fetch('/api/v1/chat/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            language: 'tw',
            speaker: this.voiceGender === 'female' ? 'female' : 'male_low'
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          if (audioBlob && audioBlob.size > 200) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            this.activeAudioElement = audio;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              this.clearSpeakingState(onEndCallback);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              this.clearSpeakingState(onEndCallback);
            };

            await audio.play();
            return true;
          }
        }
      } catch (e) {
        console.warn('[SpeechService] Khaya TTS stream notice:', e);
      }
    }

    // ENGLISH PLAYBACK: Use High-Quality Neural Human Natural Voice (Microsoft Natural / Google)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.speakingUtterance = utterance;

      const defaultVoice = this.getDefaultEnglishVoice();
      if (defaultVoice) {
        utterance.voice = defaultVoice;
        utterance.lang = defaultVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }

      if (this.voiceGender === 'female') {
        utterance.rate = 0.94;
        utterance.pitch = 1.02;
      } else {
        utterance.rate = 0.94;
        utterance.pitch = 0.98;
      }

      utterance.onend = () => this.clearSpeakingState(onEndCallback);
      utterance.onerror = () => this.clearSpeakingState(onEndCallback);

      window.speechSynthesis.speak(utterance);
      return true;
    }

    this.clearSpeakingState(onEndCallback);
    return false;
  },

  clearSpeakingState(onEndCallback = null) {
    this.speakingUtterance = null;
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement = null;
    }
    if (this.activeSpeakerBtn) {
      this.activeSpeakerBtn.classList.remove('speaking-active');
      this.activeSpeakerBtn.innerHTML = '🔊 Read Aloud';
      this.activeSpeakerBtn = null;
    }
    if (onEndCallback) onEndCallback();
  },

  stop() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement.currentTime = 0;
      this.activeAudioElement = null;
    }
    this.speakingUtterance = null;
    if (this.activeSpeakerBtn) {
      this.activeSpeakerBtn.classList.remove('speaking-active');
      this.activeSpeakerBtn.innerHTML = '🔊 Read Aloud';
      this.activeSpeakerBtn = null;
    }
  },

  detectTwiLanguage(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    const twiKeywords = [
      'apɔmuden', 'aduru', 'nyinsɛn', 'kasa', 'dabi', 'aane', 'nibima', 'taabea',
      'kontomire', 'nufusuo', 'bisa', 'akwadaa', 'yareɛ', 'nsɛm', 'wo ho', 'me ho',
      'abofra', 'mogya', 'tiri', 'nsuo', 'kɔ', 'ayaresabea', 'dɔketa'
    ];
    return twiKeywords.some(kw => lower.includes(kw)) || /[ɔɛ]/i.test(text);
  }
};

SpeechService.initVoices();
