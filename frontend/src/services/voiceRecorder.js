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

let currentRecognition = null;

export async function startVoiceRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  const SpeechRecognition =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLang === "twi" ? "ak-GH" : "en-US";

      let capturedText = "";

      recognition.onstart = () => {
        if (onStart) onStart();
      };

      recognition.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          capturedText = event.results[0][0].transcript || "";
        }
      };

      recognition.onerror = () => {
        if (onEnd) onEnd();
      };

      recognition.onend = () => {
        if (onEnd) onEnd();
        if (capturedText.trim() && onResult) {
          onResult(capturedText.trim());
        }
      };

      currentRecognition = recognition;
      recognition.start();
      return recognition;
    } catch (err) {
      if (onEnd) onEnd();
      return null;
    }
  }

  // Gracefully end if speech recognition unavailable
  if (onEnd) onEnd();
  return null;
}

export function stopVoiceRecording(activeRecorder) {
  const rec = activeRecorder || currentRecognition;
  if (rec) {
    if (typeof rec.stop === "function") {
      try { rec.stop(); } catch (e) { /* ignore */ }
    }
    if (typeof rec.abort === "function") {
      try { rec.abort(); } catch (e) { /* ignore */ }
    }
  }
  currentRecognition = null;
}
