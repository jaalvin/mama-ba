/**
 * Neural Speech Service
 * Routes speech synthesis to Abena AI Neural TTS API (/api/v1/chat/tts)
 * for Ghanaian Akan Twi (abena_twi_high) and Ghanaian English (akua_eng).
 * Features 0ms instant persistent audio caching (memory + localStorage)
 * so playing a phrase for the second time is instant with zero delay.
 */

import { api } from "./api.js";

let activeAudioElement = null;
let activeObjectUrl = null;
let currentSpeechId = 0;

// Client-side Blob cache for instant 0ms audio playback
const clientBlobCache = new Map();

/** Convert a Blob to Base64 string for persistent caching */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convert a Base64 data URL back to a Blob */
function base64ToBlob(base64DataUrl) {
  const parts = base64DataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "audio/mpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/** Generate safe cache key for text */
function getStorageKey(cacheKey) {
  let hash = 0;
  for (let i = 0; i < cacheKey.length; i++) {
    hash = (hash << 5) - hash + cacheKey.charCodeAt(i);
    hash |= 0;
  }
  return `mama_ba_audio_v2_${Math.abs(hash)}`;
}

/**
 * Stop any active audio element and browser speech synthesis.
 * Invalidates all in-flight async TTS requests to prevent echo.
 */
export function stopNeuralSpeech() {
  currentSpeechId++; // Invalidate any in-flight async fetches!

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = "";
    } catch (e) {
      /* ignore */
    }
    activeAudioElement = null;
  }

  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch (e) {
      /* ignore */
    }
    activeObjectUrl = null;
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      /* ignore */
    }
  }
}

function playBrowserSpeech(text, isTwi, thisRequestId, onStart, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (thisRequestId === currentSpeechId && onEnd) onEnd();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isTwi ? "ak-GH" : "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (thisRequestId === currentSpeechId && onStart) onStart();
    };
    utterance.onend = () => {
      if (thisRequestId === currentSpeechId && onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.warn("[Speech] Browser WebSpeech error:", e);
      if (thisRequestId === currentSpeechId && onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("[Speech] Browser WebSpeech exception:", err);
    if (thisRequestId === currentSpeechId && onEnd) onEnd();
    return false;
  }
}

/**
 * Synthesizes and plays fluent Ghanaian speech with instant persistent caching
 * to guarantee zero delay on repeat playback.
 */
export async function playNeuralSpeech(text, langCode = "twi", onStart, onEnd, onError) {
  stopNeuralSpeech();
  const thisRequestId = currentSpeechId; // Captured token for this exact request

  const cleanText = (text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_#`~•\-–—]/g, " ")
    .replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return false;
  }

  const normalizedLang = (langCode || "").toLowerCase().trim();
  const isTwi = normalizedLang === "twi" || normalizedLang === "tw" || normalizedLang === "ak" || normalizedLang === "twi_only" || normalizedLang === "akan";
  const voice = isTwi ? "abena_twi_high" : "akua_eng";
  const cacheKey = `${voice}:${cleanText.toLowerCase()}`;
  const lsKey = getStorageKey(cacheKey);

  // Instantly trigger onStart so UI immediately displays active speaking state
  if (onStart) onStart();

  try {
    let audioBlob = clientBlobCache.get(cacheKey);

    // Check persistent localStorage cache if not in memory
    if (!audioBlob && typeof window !== "undefined" && window.localStorage) {
      const storedBase64 = localStorage.getItem(lsKey);
      if (storedBase64) {
        try {
          const parsedBlob = base64ToBlob(storedBase64);
          if (parsedBlob && parsedBlob.size > 200) {
            audioBlob = parsedBlob;
            clientBlobCache.set(cacheKey, audioBlob);
          } else {
            localStorage.removeItem(lsKey);
          }
        } catch (e) {
          localStorage.removeItem(lsKey);
        }
      }
    }

    // Fetch from server if not cached locally
    if (!audioBlob) {
      const res = await api.synthesizeSpeech({
        text: cleanText,
        voice,
        language: isTwi ? "tw" : "en",
        speaker_id: "female",
      });

      if (res && res.success && res.blob && res.blob.size > 200) {
        audioBlob = res.blob;
        clientBlobCache.set(cacheKey, audioBlob);

        // Save to persistent storage for instant 0ms playback on restart/repeat
        try {
          const b64 = await blobToBase64(audioBlob);
          localStorage.setItem(lsKey, b64);
        } catch (e) {
          /* localStorage full notice ignored */
        }
      }
    }

    // Check if a newer speech request or stop request came in while fetching
    if (thisRequestId !== currentSpeechId) {
      return false;
    }

    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      activeObjectUrl = audioUrl;
      const audio = new Audio(audioUrl);
      activeAudioElement = audio;

      audio.onplay = () => {
        if (thisRequestId === currentSpeechId && onStart) {
          onStart();
        }
      };
      audio.onended = () => {
        if (activeObjectUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          activeObjectUrl = null;
        }
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        if (thisRequestId === currentSpeechId && onEnd) {
          onEnd();
        }
      };
      audio.onerror = () => {
        if (activeObjectUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          activeObjectUrl = null;
        }
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        console.warn("[Speech] HTML5 Audio element error. Falling back to browser WebSpeech...");
        playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise.catch((err) => {
          console.warn("[Speech] HTML5 Audio play promise blocked/failed:", err);
          // If browser blocked audio play (e.g. autoplay policy restriction):
          // Fallback seamlessly to browser WebSpeech API!
          playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
        });
      }
      return true;
    }

    // Fallback to browser WebSpeech API if server audio could not be generated (Abena AI & Khaya AI unavailable)
    return playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
  } catch (err) {
    console.warn("[Speech] Abena AI synthesis notice:", err);
    return playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
  }
}
