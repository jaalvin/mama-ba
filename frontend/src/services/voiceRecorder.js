/**
 * Voice Recorder Service
 * Handles microphone audio recording and routes Akan Twi speech
 * to Abena AI Neural ASR API (/api/v1/chat/asr).
 */

import { api } from "./api.js";

let currentMediaRecorder = null;
let currentAudioStream = null;

export async function startVoiceRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  const isEnglish = voiceLang === "en" || voiceLang === "english";

  // 1. ENGLISH MODE: Use native browser SpeechRecognition if supported
  if (isEnglish) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => { if (onStart) onStart(); };
        recognition.onend = () => { if (onEnd) onEnd(); };
        recognition.onerror = () => {
          if (onEnd) onEnd();
          if (onError) onError("English voice not recognized. Please try speaking again.");
        };
        recognition.onresult = (event) => {
          const transcript = event.results[0][0]?.transcript;
          if (transcript && onResult) onResult(transcript);
        };

        recognition.start();
        return recognition;
      } catch (e) {
        console.warn("[VoiceRecorder] Native English speech recognition fallback:", e);
      }
    }
  }

  // 2. TWI MODE (and English fallback): MediaRecorder mic stream -> Abena AI Neural ASR (/api/v1/chat/asr)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentAudioStream = stream;
    const mediaRecorder = new MediaRecorder(stream);
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

      // Release microphone tracks
      if (currentAudioStream) {
        currentAudioStream.getTracks().forEach((track) => track.stop());
        currentAudioStream = null;
      }
      currentMediaRecorder = null;

      const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });

      if (rawBlob.size < 20) {
        if (onError) onError("Recording empty. Please try speaking again.");
        return;
      }

      // Convert Blob to Base64 and send to Abena AI Neural ASR API
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        try {
          const res = await api.transcribeVoice({ audio_base64: base64Audio, language: "twi" });
          if (res && res.success && res.transcription) {
            if (onResult) onResult(res.transcription);
          } else {
            if (onError) onError(res?.error || "Could not transcribe Twi speech. Please speak closer to mic.");
          }
        } catch (err) {
          if (onError) onError("Network error transcribing Twi speech.");
        }
      };
      reader.readAsDataURL(rawBlob);
    };

    mediaRecorder.start();
    return mediaRecorder;
  } catch (err) {
    if (onEnd) onEnd();
    if (onError) onError("Microphone access is required for Twi voice recording.");
    return null;
  }
}

export function stopVoiceRecording(activeRecorder) {
  if (activeRecorder) {
    if (typeof activeRecorder.stop === "function") {
      try {
        activeRecorder.stop();
      } catch (e) {
        /* ignore */
      }
    }
  }

  if (currentMediaRecorder && currentMediaRecorder.state !== "inactive") {
    try {
      currentMediaRecorder.stop();
    } catch (e) {
      /* ignore */
    }
  }

  if (currentAudioStream) {
    try {
      currentAudioStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      /* ignore */
    }
    currentAudioStream = null;
  }
}
