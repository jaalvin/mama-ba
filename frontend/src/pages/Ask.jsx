import React, { useRef, useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";

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
  const [inputQuery, setInputQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  const processQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const userMsgId = Date.now();
    const assistantMsgId = userMsgId + 1;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", en: queryText, twi: queryText },
    ]);
    setInputQuery("");
    setLoading(true);

    try {
      // Call backend AI / RAG query endpoint persistent in SQLite
      const res = await api.askChatbot({ query: queryText, language: lang });

      let aiEn = "Thank you for asking. Please follow up with your midwife for personalized clinical guidance.";
      let aiTwi = "Meda wo ase wɔ wo asɛm ho. Kɔ fa kyerɛ wo ɔwɔfoɔ anaa ayaresabea.";

      if (res.success && res.answer) {
        if (typeof res.answer === "object") {
          aiEn = res.answer.english || res.answer.en || aiEn;
          aiTwi = res.answer.twi || res.answer.ak || aiTwi;
        } else if (typeof res.answer === "string") {
          aiEn = res.answer;
          aiTwi = res.answer;
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", en: aiEn, twi: aiTwi },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          en: "Mama Ba is operating in offline mode. For emergency concerns, visit your nearest GHS clinic.",
          twi: "Mama Ba wɔ offline mu. Sɛ oyare mu yɛ den a, kɔ ayaresabea ntɛm.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser yet. Try Chrome on Android or desktop.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "twi" ? "ak-GH" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processQuery(transcript);
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
              <p className="text-sm leading-relaxed">{lang === "twi" ? m.twi : m.en}</p>

              {m.role === "assistant" && (
                <>
                  <div className="mt-2 pt-2 border-t border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {lang === "twi" ? m.en : m.twi}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => speak(m.en, "en")}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary-container/30 text-primary border border-primary/20 hover:bg-primary-container/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">volume_up</span>
                      EN-GH
                    </button>
                    <button
                      onClick={() => speak(m.twi, "twi")}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-tertiary-container/20 text-tertiary border border-tertiary/20 hover:bg-tertiary-container/40 transition-colors"
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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-xs text-on-surface-variant">
                {lang === "twi" ? "Mama Ba redwene..." : "Mama Ba is thinking..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="pb-4 flex flex-col gap-3">
        {/* Preset Q&A Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PRESET_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => processQuery(lang === "twi" ? q.twi : q.en)}
              className="shrink-0 bg-primary-container/20 text-on-surface border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary-container/40 transition-colors max-w-[200px] text-left leading-snug"
            >
              {lang === "twi" ? q.twi : q.en}
            </button>
          ))}
        </div>

        {/* Input Bar with Text + Voice */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processQuery(inputQuery);
          }}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-3 py-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              lang === "twi"
                ? "Kyerɛw anaa bisa asɛm wɔ Twi/Borɔfo mu..."
                : "Type or speak a health question..."
            }
            className="flex-1 bg-transparent px-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
          />

          <button
            type="button"
            onClick={startListening}
            aria-label="Voice input"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              listening ? "bg-error text-on-error animate-pulse" : "bg-surface-container-high text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>

          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>

        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 flex items-start gap-2">
          <span className="material-symbols-outlined text-outline text-[16px] shrink-0 mt-0.5">info</span>
          <p className="text-xs text-outline leading-tight">
            {lang === "twi"
              ? "Mama Ba ma nsɛm a ɛfata. All Q&A data is saved securely into your SQLite database."
              : "Mama Ba provides guidance. Q&A data is saved securely into your persistent backend SQLite database."}
          </p>
        </div>
      </div>
    </div>
  );
}