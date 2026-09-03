import { api } from "./api.js";

let activeRecorderInstance = null;

export async function startVoiceRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  // 1. Instantly trigger onStart so UI changes to active mic/listening mode immediately
  if (onStart) onStart();

  const isEnglish = voiceLang === "en" || voiceLang === "english";
  const SpeechRecognition =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Try browser SpeechRecognition first
  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = isEnglish ? "en-US" : "ak-GH";

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
        // Fallback to MediaRecorder + Abena ASR if SpeechRecognition errors
        startAbenaMediaRecorder({ voiceLang, onStart, onResult, onError, onEnd });
      };

      recognition.onend = () => {
        if (capturedText.trim()) {
          if (onEnd) onEnd();
          if (onResult) onResult(capturedText.trim());
        } else {
          // If ended with no transcript, fallback to Abena ASR MediaRecorder
          startAbenaMediaRecorder({ voiceLang, onStart, onResult, onError, onEnd });
        }
      };

      activeRecorderInstance = recognition;
      recognition.start();
      return recognition;
    } catch (err) {
      console.warn("[VoiceRecorder] SpeechRecognition start notice, trying Abena ASR fallback:", err);
    }
  }

  // Fallback: Use MediaRecorder + Abena AI Neural ASR API
  return startAbenaMediaRecorder({ voiceLang, onStart, onResult, onError, onEnd });
}

async function startAbenaMediaRecorder({ voiceLang, onStart, onResult, onError, onEnd }) {
  const isEnglish = voiceLang === "en" || voiceLang === "english";
  const asrLanguage = isEnglish ? "en" : "twi";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstart = () => {
      if (onStart) onStart();
    };

    mediaRecorder.onstop = async () => {
      if (onEnd) onEnd();
      stream.getTracks().forEach((track) => track.stop());

      const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      if (rawBlob.size < 50) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        try {
          const res = await api.transcribeVoice({ audio_base64: base64Audio, language: asrLanguage });
          if (res && res.success && res.transcription && onResult) {
            onResult(res.transcription);
          }
        } catch (e) {
          console.warn("[VoiceRecorder] ASR error:", e);
        }
      };
      reader.readAsDataURL(rawBlob);
    };

    activeRecorderInstance = mediaRecorder;
    mediaRecorder.start(100);
    return mediaRecorder;
  } catch (err) {
    if (onEnd) onEnd();
    return null;
  }
}

export function stopVoiceRecording(activeRecorder) {
  const rec = activeRecorder || activeRecorderInstance;
  if (rec) {
    if (typeof rec.stop === "function") {
      try { rec.stop(); } catch (e) { /* ignore */ }
    }
    if (typeof rec.abort === "function") {
      try { rec.abort(); } catch (e) { /* ignore */ }
    }
  }
  activeRecorderInstance = null;
}
