import { api } from "./api.js";

let activeRecorderInstance = null;
let activeStream = null;

export async function startVoiceRecording({ voiceLang, onStart, onResult, onError, onEnd }) {
  const isEnglish = voiceLang === "en" || voiceLang === "english";
  const asrLanguage = isEnglish ? "en" : "twi";

  // 1. Explicitly request microphone stream to trigger browser permission dialog if needed
  let stream = null;
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStream = stream;
    }
  } catch (err) {
    if (onEnd) onEnd();
    if (onError) {
      onError("Microphone permission needed. Please allow microphone access in your browser settings to use voice features.");
    }
    return null;
  }

  // 2. Instantly notify UI that mic recording/listening mode is active
  if (onStart) onStart();

  // 3. Direct MediaRecorder -> Abena AI Neural ASR API for 100% reliable voice transcription
  try {
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
      releaseStream();

      const rawBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      if (rawBlob.size < 100) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        try {
          const res = await api.transcribeVoice({ audio_base64: base64Audio, language: asrLanguage });
          if (res && res.success && res.transcription && onResult) {
            onResult(res.transcription);
          } else if (res && res.error && onError) {
            onError(res.error);
          }
        } catch (e) {
          console.warn("[VoiceRecorder] Abena ASR error:", e);
        }
      };
      reader.readAsDataURL(rawBlob);
    };

    activeRecorderInstance = mediaRecorder;
    mediaRecorder.start(100);
    return mediaRecorder;
  } catch (err) {
    if (onEnd) onEnd();
    releaseStream();
    return null;
  }
}

function releaseStream() {
  if (activeStream) {
    try {
      activeStream.getTracks().forEach((track) => track.stop());
    } catch (e) { /* ignore */ }
    activeStream = null;
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
  releaseStream();
}
