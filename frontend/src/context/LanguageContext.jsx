import { createContext, useContext, useState, useEffect } from "react";
import { playNeuralSpeech, stopNeuralSpeech as haltSpeech } from "../services/speech.js";

const LanguageContext = createContext(null);

/** Bilingual string helper — pass { en, twi } and get the right string. */
export function t(strings, lang) {
  return lang === "twi" ? strings.twi : strings.en;
}

/** Stop any currently active speech synthesis */
export function stopSpeech() {
  haltSpeech();
}

/** Pause currently active speech */
export function pauseSpeech() {
  haltSpeech();
}

/** Resume paused speech */
export function resumeSpeech() {
  /* no-op for neural audio stream */
}

/** Play full statement voice sample via Abena AI Neural Speech API */
export function playVoiceSample(language, onStart, onEnd) {
  const phrase =
    language === "twi"
      ? "Akwaaba! Me ne Mama Ba, wo nnamfo pa wɔ nyinsɛn mu. Metumi aboa wo wɔ apomuden ne wo ba no ho."
      : "Welcome to Mama Ba! I am your personal maternal health companion, here to support you through your pregnancy and early motherhood.";

  playNeuralSpeech(phrase, language, onStart, onEnd, onEnd);
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
