import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

/** Bilingual string helper — pass { en, twi } and get the right string. */
export function t(strings, lang) {
  return lang === "twi" ? strings.twi : strings.en;
}

// Module-level persistent reference to prevent Chrome/Edge garbage collection from cutting off speech mid-sentence
let activeUtterance = null;

/** Stop any currently active speech synthesis */
export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    activeUtterance = null;
  }
}

/** Pause currently active speech */
export function pauseSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.pause();
    } catch {
      /* ignore */
    }
  }
}

/** Resume paused speech */
export function resumeSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
  }
}

/** Play full statement voice sample with garbage-collection protection and callbacks */
export function playVoiceSample(language, onStart, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech
  stopSpeech();

  const phrase =
    language === "twi"
      ? "Akwaaba! Me ne Mama Ba, wo nnamfo pa wɔ nyinsɛn mu. Metumi aboa wo wɔ apomuden ne wo ba no ho."
      : "Welcome to Mama Ba! I am your personal maternal health companion, here to support you through your pregnancy and early motherhood.";

  // Use a slight timeout to allow Chrome speech queue reset after cancel()
  setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utt = new SpeechSynthesisUtterance(phrase);
      const voices = window.speechSynthesis.getVoices() || [];

      if (language === "twi") {
        const twiVoice =
          voices.find((v) => v.lang.includes("ak") || v.lang.includes("tw")) ||
          voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
          voices.find((v) => v.lang.includes("en-GB") && v.name.toLowerCase().includes("female")) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (twiVoice) utt.voice = twiVoice;
        utt.lang = twiVoice?.lang || "en-GB";
      } else {
        const engVoice =
          voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
          voices.find((v) => v.lang.includes("en-GB")) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (engVoice) utt.voice = engVoice;
        utt.lang = engVoice?.lang || "en-US";
      }

      utt.rate = 0.92;
      utt.pitch = 1.05;

      utt.onstart = () => {
        if (onStart) onStart();
      };

      utt.onend = () => {
        activeUtterance = null;
        if (onEnd) onEnd();
      };

      utt.onerror = () => {
        activeUtterance = null;
        if (onEnd) onEnd();
      };

      activeUtterance = utt;
      window.speechSynthesis.speak(utt);
    } catch {
      activeUtterance = null;
      if (onEnd) onEnd();
    }
  }, 60);
}

export function LanguageProvider({ children }) {
  // App UI language (default: en)
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("mama_ba_lang") || "en";
  });

  // Voice assistant language (default: twi)
  const [voiceLang, setVoiceLangState] = useState(() => {
    return localStorage.getItem("mama_ba_voice_lang") || "twi";
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [speakingLanguage, setSpeakingLanguage] = useState(null); // "twi" | "en" | null

  // Prime voices when browser is ready
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

      return () => {
        stopSpeech();
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      };
    }
  }, []);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem("mama_ba_lang", l);
  };

  const handleStopSpeech = () => {
    stopSpeech();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingLanguage(null);
  };

  const handlePauseSpeech = () => {
    pauseSpeech();
    setIsPaused(true);
  };

  const handleResumeSpeech = () => {
    resumeSpeech();
    setIsPaused(false);
  };

  const handlePlayVoiceSample = (vl) => {
    if (isSpeaking && speakingLanguage === vl && !isPaused) {
      handlePauseSpeech();
      return;
    }
    if (isSpeaking && speakingLanguage === vl && isPaused) {
      handleResumeSpeech();
      return;
    }

    handleStopSpeech();
    playVoiceSample(
      vl,
      () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setSpeakingLanguage(vl);
      },
      () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingLanguage(null);
      }
    );
  };

  const setVoiceLang = (vl, playSample = false) => {
    setVoiceLangState(vl);
    localStorage.setItem("mama_ba_voice_lang", vl);
    if (playSample) {
      handlePlayVoiceSample(vl);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        voiceLang,
        setVoiceLang,
        isSpeaking,
        isPaused,
        speakingLanguage,
        stopSpeech: handleStopSpeech,
        pauseSpeech: handlePauseSpeech,
        resumeSpeech: handleResumeSpeech,
        playVoiceSample: handlePlayVoiceSample,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
