import { useRef, useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";

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

function speak(text, lang) {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "twi" ? "ak" : "en-GH";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

export default function Ask() {
  const { lang } = useLang();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      en: "Hi, I'm here to help. Ask me anything about your pregnancy or your baby, in English or Twi.",
      twi: "Akwaaba! Mewɔ ha sɛ meboa wo. Bisa me biribiara fa wo abɔdeɛ anaa wo ba ho asɛm.",
    },
  ]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const addQuestion = (q) => {
    const text = lang === "twi" ? q.twi : q.en;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", en: text, twi: text },
      {
        id: Date.now() + 1,
        role: "assistant",
        en: "Thanks for your question. Let me connect you with guidance on that shortly.",
        twi: "Meda wo ase wɔ wo asɛm ho. Mɛfa ho nsɛm bra ntɛm.",
      },
    ]);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser yet. Try Chrome on Android or desktop.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", en: transcript, twi: transcript },
        {
          id: Date.now() + 1,
          role: "assistant",
          en: "Thanks for your question. Let me connect you with guidance on that shortly.",
          twi: "Meda wo ase wɔ wo asɛm ho. Mɛfa ho nsɛm bra ntɛm.",
        },
      ]);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] px-4 md:px-6 max-w-lg mx-auto">
      {/* Transcript */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                m.role === "user"
                  ? "bg-primary text-on-primary rounded-tr-sm"
                  : "bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-sm"
              }`}
            >
              {/* Primary language text */}
              <p className="text-sm leading-relaxed">{lang === "twi" ? m.twi : m.en}</p>

              {/* Bilingual secondary for assistant messages */}
              {m.role === "assistant" && (
                <>
                  <div className="mt-2 pt-2 border-t border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {lang === "twi" ? m.en : m.twi}
                    </p>
                  </div>
                  {/* Playback buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => speak(m.en, "en")}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-container/30 text-primary border border-primary/20 hover:bg-primary-container/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">volume_up</span>
                      EN-GH
                    </button>
                    <button
                      onClick={() => speak(m.twi, "twi")}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-tertiary-container/20 text-tertiary border border-tertiary/20 hover:bg-tertiary-container/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">volume_up</span>
                      Twi
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
              className="shrink-0 bg-primary-container/20 text-on-surface border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary-container/40 transition-colors max-w-[180px] text-left leading-snug"
            >
              {lang === "twi" ? q.twi : q.en}
            </button>
          ))}
        </div>

        {/* Audio Recording Bar */}
        <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-3">
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
          <p className="flex-1 text-sm text-on-surface-variant">
            {listening
              ? (lang === "twi" ? "Mete..." : "Listening...")
              : (lang === "twi" ? "Tap sɛ wobɛkasa wɔ English anaa Twi" : "Tap to speak in English or Twi")}
          </p>
          <button
            onClick={startListening}
            aria-label={lang === "twi" ? "Bisa asɛm" : "Ask a question by voice"}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0 ${
              listening ? "bg-error animate-pulse" : "bg-primary"
            }`}
          >
            <span className="material-symbols-outlined text-on-primary text-[24px]">mic</span>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-outline text-[16px] shrink-0 mt-0.5">info</span>
          <p className="text-xs text-outline">
            {lang === "twi"
              ? "Mama Ba ma nsɛm a ɛfata. Kɔ onyansafo wɔ asiane mu."
              : "Mama Ba provides general guidance. Always consult a doctor for serious concerns. Voice recordings are not stored after your session ends."}
          </p>
        </div>
      </div>
    </div>
  );
}