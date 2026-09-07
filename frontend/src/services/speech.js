/**
 * Neural Speech Service
 * Routes speech synthesis to Abena AI Neural TTS API (/api/v1/chat/tts)
 * for Ghanaian Akan Twi (abena_twi_high) and Ghanaian English (akua_eng).
 * Uses Web Audio API (AudioContext) for reliable playback on mobile/iOS Safari,
 * with HTML5 Audio and WebSpeech API fallbacks.
 * Features 0ms instant persistent audio caching (memory + localStorage).
 */

import { api } from "./api.js";

let globalAudioCtx = null;
let activeSourceNode = null;
let activeAudioElement = null;
let activeObjectUrl = null;
let currentSpeechId = 0;
let primedAudioElement = null;

// Client-side Blob cache for instant 0ms audio playback
const clientBlobCache = new Map();

/**
 * Gets or creates the global AudioContext instance.
 * Must be resumed inside a user gesture for iOS Safari compatibility.
 */
export function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/**
 * Convert a Blob to ArrayBuffer safely across all browser versions.
 */
async function blobToArrayBuffer(blob) {
  if (blob.arrayBuffer) {
    return await blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Decode AudioData asynchronously supporting both Promise and callback implementations.
 */
function decodeAudioDataAsync(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const promiseResult = ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => resolve(decoded),
        (err) => reject(err)
      );
      if (promiseResult && typeof promiseResult.then === "function") {
        promiseResult.then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

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
 * Stop any active audio playback (Web Audio source node, HTML5 Audio, WebSpeech).
 * Invalidates all in-flight async TTS requests to prevent overlapping audio.
 */
export function stopNeuralSpeech() {
  currentSpeechId++; // Invalidate any in-flight async fetches!

  if (activeSourceNode) {
    try {
      activeSourceNode.onended = null;
      activeSourceNode.stop(0);
      activeSourceNode.disconnect();
    } catch (e) {
      /* ignore */
    }
    activeSourceNode = null;
  }

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

function getBestBrowserVoice(isTwi) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  if (isTwi) {
    return (
      voices.find((v) => v.lang.toLowerCase().includes("ak") || v.lang.toLowerCase().includes("tw")) ||
      voices.find((v) => v.lang.toLowerCase().includes("gh")) ||
      voices.find((v) => v.lang.toLowerCase().includes("ng")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
      voices[0]
    );
  } else {
    return (
      voices.find((v) => v.lang === "en-US" || v.lang === "en_US") ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en-gb") || v.lang.toLowerCase().startsWith("en-us")) ||
      voices.find((v) => v.lang.toLowerCase().includes("gh")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
      voices[0]
    );
  }
}

function playBrowserSpeech(text, isTwi, thisRequestId, onStart, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (thisRequestId === currentSpeechId && onEnd) onEnd();
    return false;
  }

  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const bestVoice = getBestBrowserVoice(isTwi);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = isTwi ? "en-US" : "en-US";
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    let hasStarted = false;
    utterance.onstart = () => {
      hasStarted = true;
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

    // Safety fallback for browsers where onstart event does not trigger immediately
    setTimeout(() => {
      if (!hasStarted && thisRequestId === currentSpeechId && onStart) {
        onStart();
      }
    }, 150);

    return true;
  } catch (err) {
    console.warn("[Speech] Browser WebSpeech exception:", err);
    if (thisRequestId === currentSpeechId && onEnd) onEnd();
    return false;
  }
}

/**
 * Prime audio engines (Web Audio API context + silent HTML5 element)
 * synchronously inside a user gesture handler (click/touch).
 */
export function primeSpeechAudio() {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (!primedAudioElement) {
      primedAudioElement = new Audio();
    }
    primedAudioElement.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    primedAudioElement.play().catch(() => {});
  } catch (e) {
    /* ignore */
  }
}

/**
 * Plays audio using Web Audio API (AudioBufferSourceNode).
 * Decodes audio buffer asynchronously and plays it without iOS autoplay blocks.
 */
async function playWithWebAudio(audioBlob, thisRequestId, onStart, onEnd) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const arrayBuffer = await blobToArrayBuffer(audioBlob);
    const audioBuffer = await decodeAudioDataAsync(ctx, arrayBuffer);

    if (thisRequestId !== currentSpeechId) {
      return true; // Request cancelled by user
    }

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);
    activeSourceNode = sourceNode;

    sourceNode.onended = () => {
      if (activeSourceNode === sourceNode) {
        activeSourceNode = null;
      }
      if (thisRequestId === currentSpeechId && onEnd) {
        onEnd();
      }
    };

    // Start audio playback
    sourceNode.start(0);

    // Only notify UI that speaking started once audio actually starts playing!
    if (thisRequestId === currentSpeechId && onStart) {
      onStart();
    }
    return true;
  } catch (err) {
    console.warn("[Speech] WebAudio playback failed, trying HTML5 fallback:", err);
    return false;
  }
}

/**
 * Plays audio using standard HTML5 Audio element fallback.
 */
async function playWithHtml5Audio(audioBlob, thisRequestId, onStart, onEnd) {
  if (thisRequestId !== currentSpeechId) return false;

  const audioUrl = URL.createObjectURL(audioBlob);
  activeObjectUrl = audioUrl;

  const audio = primedAudioElement || new Audio();
  primedAudioElement = null;
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
  };

  audio.src = audioUrl;
  try {
    await audio.play();
    return true;
  } catch (err) {
    console.warn("[Speech] HTML5 Audio play promise failed:", err);
    if (activeObjectUrl === audioUrl) {
      URL.revokeObjectURL(audioUrl);
      activeObjectUrl = null;
    }
    if (activeAudioElement === audio) {
      activeAudioElement = null;
    }
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

  // Prime Web Audio and HTML5 elements
  primeSpeechAudio();

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
      // 1. Primary: Web Audio API (AudioBufferSourceNode) - Works 100% on mobile/iOS Safari after async fetch
      const webAudioSuccess = await playWithWebAudio(audioBlob, thisRequestId, onStart, onEnd);
      if (webAudioSuccess) return true;

      // 2. Secondary: HTML5 Audio fallback
      const html5Success = await playWithHtml5Audio(audioBlob, thisRequestId, onStart, onEnd);
      if (html5Success) return true;
    }

    // 3. Fallback: Browser WebSpeech API
    return playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
  } catch (err) {
    console.warn("[Speech] Abena AI synthesis notice:", err);
    return playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
  }
}

/**
 * Instant Fast Browser Speech Synthesis (0ms delay, instant local speech)
 * Uses browser WebSpeech API directly for Ghanaian English & Akan Twi.
 */
export function playFastBrowserSpeech(text, langCode = "twi", onStart, onEnd, onError) {
  stopNeuralSpeech();
  const thisRequestId = currentSpeechId;

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

  return playBrowserSpeech(cleanText, isTwi, thisRequestId, onStart, onEnd);
}


