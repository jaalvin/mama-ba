/**
 * Voice Recorder Service
 * Handles microphone audio recording and routes speech
 * to Abena AI Neural ASR API (/api/v1/chat/asr) for both English & Twi.
 *
 * Language routing:
 *   - voiceLang === "en" → tries browser SpeechRecognition first (fast),
 *     then falls back to Abena AI ASR with language:"en" (twi-en bilingual model)
 *   - voiceLang === "twi" → records via MediaRecorder → sends to Abena AI ASR
 *     with language:"twi" (twi-only model)
 */

import { api } from "./api.js";

let currentMediaRecorder = null;
let currentAudioStream = null;

export async function startVoiceRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  const isEnglish = voiceLang === "en" || voiceLang === "english";

  // ── 1. ENGLISH MODE: Try native browser SpeechRecognition first (fastest) ──
  if (isEnglish) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let hasResult = false;

        recognition.onstart = () => { if (onStart) onStart(); };
        recognition.onend = () => {
          if (!hasResult && onEnd) onEnd();
        };
        recognition.onerror = async (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            if (onError) onError("Microphone permission denied. Please allow microphone access.");
            return;
          }
          // For other errors: fall through to Abena ASR for English
          console.warn("[VoiceRecorder] Browser SpeechRecognition error, falling through to Abena ASR:", event.error);
          if (onEnd) onEnd();
          await startAbenaRecording({ voiceLang: "en", onStart, onResult, onError, onEnd });
        };
        recognition.onresult = (event) => {
          hasResult = true;
          const transcript = event.results[0][0]?.transcript;
          if (transcript && onResult) {
            onResult(transcript);
          } else {
            if (onEnd) onEnd();
          }
        };

        recognition.start();
        return recognition;
      } catch (e) {
        console.warn("[VoiceRecorder] SpeechRecognition instantiation failed, using Abena ASR:", e);
        // Fall through to Abena ASR
      }
    }
  }

  // ── 2. TWI MODE + English fallback: MediaRecorder → Abena AI Neural ASR ──
  return startAbenaRecording({ voiceLang, onStart, onResult, onError, onEnd });
}

/**
 * Records audio via MediaRecorder and sends to Abena AI ASR endpoint.
 * Works for both English (twi-en bilingual model) and Twi (twi-only model).
 */
async function startAbenaRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  const isEnglish = voiceLang === "en" || voiceLang === "english";
  const asrLanguage = isEnglish ? "en" : "twi";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentAudioStream = stream;

    // Prefer webm/opus for best quality, fallback to browser default
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    currentMediaRecorder = mediaRecorder;
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstart = () => {
      if (onStart) onStart();
    };

    mediaRecorder.onstop = async () => {
      if (onEnd) onEnd();

      // Release microphone tracks immediately
      if (currentAudioStream) {
        currentAudioStream.getTracks().forEach((track) => track.stop());
        currentAudioStream = null;
      }
      currentMediaRecorder = null;

      const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });

      if (rawBlob.size < 20) {
        if (onError) onError(
          isEnglish
            ? "Recording too short. Please speak again."
            : "Asɛm a wokaa no tɛ. Xowa bisa bio."
        );
        return;
      }

      // Convert Blob → Base64 DataURL → send to Abena AI Neural ASR
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        try {
          const res = await api.transcribeVoice({
            audio_base64: base64Audio,
            language: asrLanguage,
          });

          if (res && res.success && res.transcription) {
            if (onResult) onResult(res.transcription);
          } else {
            const errMsg = isEnglish
              ? "Could not recognize English speech. Please speak clearly and try again."
              : "Abena AI ntumi nte wo Twi kasa no. Xowa kasa bio tɛ.";
            if (onError) onError(res?.error || errMsg);
          }
        } catch (err) {
          console.error("[VoiceRecorder] ASR network error:", err);
          if (onError) onError(
            isEnglish
              ? "Network error. Please check your connection and try again."
              : "Network asɛm bi wɔ hɔ. Xowa hwɛ wo connection."
          );
        }
      };
      reader.readAsDataURL(rawBlob);
    };

    mediaRecorder.start();
    return mediaRecorder;
  } catch (err) {
    if (onEnd) onEnd();
    const denied =
      err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
    if (onError) onError(
      denied
        ? "Microphone permission denied. Please allow microphone access in your browser settings."
        : "Microphone access is required for voice recording."
    );
    return null;
  }
}

export function stopVoiceRecording(activeRecorder) {
  if (activeRecorder) {
    if (typeof activeRecorder.stop === "function") {
      try { activeRecorder.stop(); } catch (e) { /* ignore */ }
    }
    // Also handle SpeechRecognition instances (they have abort/stop)
    if (typeof activeRecorder.abort === "function") {
      try { activeRecorder.abort(); } catch (e) { /* ignore */ }
    }
  }

  if (currentMediaRecorder && currentMediaRecorder.state !== "inactive") {
    try { currentMediaRecorder.stop(); } catch (e) { /* ignore */ }
  }

  if (currentAudioStream) {
    try {
      currentAudioStream.getTracks().forEach((track) => track.stop());
    } catch (e) { /* ignore */ }
    currentAudioStream = null;
  }
}
