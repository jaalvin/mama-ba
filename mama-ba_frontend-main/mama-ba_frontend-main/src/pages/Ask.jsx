import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLang, stopSpeech } from "../context/LanguageContext.jsx";
import { Mic, Volume2, Square, Settings } from "lucide-react";

const PRESET_QUESTIONS = [
  {
    en: "Foods that increase blood during pregnancy",
    twi: "Aduane a ɛma mogya so wɔ abɔdeɛ mu",
  },
  {
    en: "Signs of pre-eclampsia to watch out for",
    twi: "Pre-eclampsia nsɛnkyerɛnneɛ",
  },
  {
    en: "Can I drink Taabea while taking antibiotics?",
    twi: "Metumi anom Taabea na metwam antibiotics?",
  },
  {
    en: "How to manage swollen feet in pregnancy",
    twi: "Sɛn na mɛsiesie nan a abɔ ntonton?",
  },
];

let askActiveUtterance = null;

function getBestVoiceForAsk(language) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  if (language === "twi") {
    const twiVoice =
      voices.find((v) => v.lang.includes("ak") || v.lang.includes("tw")) ||
      voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
      voices.find((v) => v.lang.includes("en-GB") && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang.startsWith("en"));
    return twiVoice || voices[0];
  } else {
    const engVoice =
      voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
      voices.find((v) => v.lang.includes("en-GB")) ||
      voices.find((v) => v.lang.startsWith("en"));
    return engVoice || voices[0];
  }
}

export default function Ask() {
  const { lang, voiceLang } = useLang();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      en: "Hi, I'm here to help. Ask me anything about your pregnancy or your baby in your preferred language.",
      twi: "Akwaaba! Mewɔ ha sɛ meboa wo. Bisa me biribiara fa wo abɔdeɛ anaa wo ba ho asɛm.",
    },
  ]);
  const [listening, setListening] = useState(false);
  const [currentlySpeaking, setCurrentlySpeaking] = useState(null); // id + lang key e.g. "1-twi"
  const recognitionRef = useRef(null);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      askActiveUtterance = null;
    };
  }, []);

  const speakText = (text, languageKey, audioId) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (currentlySpeaking === audioId) {
      stopSpeech();
      askActiveUtterance = null;
      setCurrentlySpeaking(null);
      return;
    }

    stopSpeech();
    const utt = new SpeechSynthesisUtterance(text);
    const bestVoice = getBestVoiceForAsk(languageKey);
    if (bestVoice) {
      utt.voice = bestVoice;
      utt.lang = bestVoice.lang || (languageKey === "twi" ? "en-GB" : "en-US");
    } else {
      utt.lang = languageKey === "twi" ? "en-GB" : "en-US";
    }

    utt.rate = 0.92;
    utt.pitch = 1.05;

    utt.onstart = () => setCurrentlySpeaking(audioId);
    utt.onend = () => {
      askActiveUtterance = null;
      setCurrentlySpeaking(null);
    };
    utt.onerror = () => {
      askActiveUtterance = null;
      setCurrentlySpeaking(null);
    };

    askActiveUtterance = utt;
    window.speechSynthesis.speak(utt);
  };

  const addQuestion = (q) => {
    const userText = voiceLang === "twi" ? q.twi : q.en;
    const assistTextEn = "Thanks for your question. Here is supportive guidance tailored for your journey.";
    const assistTextTwi = "Meda wo ase wɔ wo asɛm ho. Yɛwɔ afotu pa a ɛbɛboa wo abɔdeɛ mu.";
    const newAssisId = Date.now() + 1;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", en: userText, twi: userText },
      {
        id: newAssisId,
        role: "assistant",
        en: assistTextEn,
        twi: assistTextTwi,
      },
    ]);

    // Speak automatically in active voice language
    speakText(
      voiceLang === "twi" ? assistTextTwi : assistTextEn,
      voiceLang,
      `${newAssisId}-${voiceLang}`
    );
  };

  const startListening = () => {
    stopSpeech();
    askActiveUtterance = null;
    setCurrentlySpeaking(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser yet. Try Chrome on Android or desktop.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang === "twi" ? "ak" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const replyEn = "I heard you clearly. Let me check the clinical recommendations for that.";
      const replyTwi = "Mete wo yie. Ma me nhwɛ apomuden afotu pa a ɛbɛboa wo.";
      const replyId = Date.now() + 1;

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", en: transcript, twi: transcript },
        {
          id: replyId,
          role: "assistant",
          en: replyEn,
          twi: replyTwi,
        },
      ]);

      speakText(
        voiceLang === "twi" ? replyTwi : replyEn,
        voiceLang,
        `${replyId}-${voiceLang}`
      );
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] px-4 md:px-6 max-w-lg mx-auto">
      {/* Voice Assistant Language Badge & Switcher shortcut */}
      <div className="flex items-center justify-between py-2 border-b border-outline-variant text-xs">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="text-sm">{voiceLang === "twi" ? "🇬🇭" : "🇬🇧"}</span>
          <span className="font-semibold text-on-surface">
            {voiceLang === "twi" ? "Twi Voice Active" : "English Voice Active"}
          </span>
          {currentlySpeaking && (
            <span className="ml-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold animate-pulse">
              Speaking...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {currentlySpeaking && (
            <button
              onClick={() => {
                stopSpeech();
                askActiveUtterance = null;
                setCurrentlySpeaking(null);
              }}
              className="text-error font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          <Link
            to="/app/profile"
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                m.role === "user"
                  ? "bg-primary text-on-primary rounded-tr-sm"
                  : "bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-sm"
              }`}
            >
              {/* Primary language text */}
              <p className="text-sm leading-relaxed font-medium">
                {voiceLang === "twi" ? m.twi : m.en}
              </p>

              {/* Bilingual secondary for assistant messages */}
              {m.role === "assistant" && (
                <>
                  <div className="mt-2 pt-2 border-t border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {voiceLang === "twi" ? m.en : m.twi}
                    </p>
                  </div>
                  {/* Playback buttons with stop toggle */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => speakText(m.twi, "twi", `${m.id}-twi`)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                        currentlySpeaking === `${m.id}-twi`
                          ? "bg-error text-on-error border-error animate-pulse font-bold shadow-xs"
                          : voiceLang === "twi"
                          ? "bg-primary text-on-primary border-primary font-semibold shadow-xs"
                          : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
                      }`}
                    >
                      {currentlySpeaking === `${m.id}-twi` ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop Twi</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>🇬🇭 Twi Audio</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => speakText(m.en, "en", `${m.id}-en`)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                        currentlySpeaking === `${m.id}-en`
                          ? "bg-error text-on-error border-error animate-pulse font-bold shadow-xs"
                          : voiceLang === "en"
                          ? "bg-primary text-on-primary border-primary font-semibold shadow-xs"
                          : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
                      }`}
                    >
                      {currentlySpeaking === `${m.id}-en` ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop English</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>🇬🇧 English</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom panel */}
      <div className="pb-4 flex flex-col gap-3">
        {/* Preset Q&A Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PRESET_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => addQuestion(q)}
              className="shrink-0 bg-primary-container/20 text-on-surface border border-primary/20 rounded-full px-3.5 py-1.5 text-xs font-medium hover:bg-primary-container/40 transition-colors max-w-[200px] text-left leading-snug"
            >
              {voiceLang === "twi" ? q.twi : q.en}
            </button>
          ))}
        </div>

        {/* Audio Recording Bar */}
        <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-3 shadow-sm">
          {listening && (
            <div className="flex items-center gap-0.5 h-6">
              {[2, 4, 6, 4, 3, 5, 3, 2].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-error"
                  style={{
                    height: `${h * 3}px`,
                    animation: `pulse 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
          <p className="flex-1 text-sm text-on-surface-variant font-medium">
            {listening
              ? (voiceLang === "twi" ? "Mete wo Twi kasa..." : "Listening to English...")
              : (voiceLang === "twi" ? "Bɔ bɔton no na kasa wɔ Twi mu" : "Tap the mic to speak in English")}
          </p>
          <button
            onClick={startListening}
            aria-label={voiceLang === "twi" ? "Bisa asɛm wɔ Twi mu" : "Ask a question in English"}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0 ${
              listening ? "bg-error animate-pulse text-white" : "bg-primary text-on-primary"
            }`}
          >
            <Mic className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}