import React, { useRef, useState } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Ask() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "Akwaaba! Me din de Mama Ba. Bisa me biribiara fa wo apɔmuden anaa wo ba ho wɔ Twi anaa Borɔfo mu.\n\n(English: Welcome! I am Mama Ba, your guided health companion. Ask me any maternal or child health question.)",
      twiText: "Akwaaba! Me din de Mama Ba. Bisa me biribiara fa wo apɔmuden anaa wo ba ho.",
      englishText: "Welcome! I am Mama Ba, your guided health companion. Ask me any maternal or child health question."
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en"); // 'en' or 'tw'
  const [playingId, setPlayingId] = useState(null);
  const recognitionRef = useRef(null);

  const presetPromptChips = [
    { label: "🩸 Foods for iron & blood", query: "What local Ghanaian foods give iron and increase blood during pregnancy?" },
    { label: "⚠️ Pre-eclampsia danger signs", query: "What are the danger signs of pre-eclampsia and high blood pressure?" },
    { label: "🌿 Taabea & Antibiotics safety", query: "Can I drink Taabea or Nibima while taking prescription antibiotics?" },
    { label: "🍼 Infant vaccination schedule", query: "What vaccines does my newborn baby need according to GHS guidelines?" }
  ];

  const handleSendQuery = async (queryText) => {
    const text = queryText || inputText;
    if (!text.trim() || loading) return;

    const userMsgId = Date.now();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text }]);
    setInputText("");
    setLoading(true);

    const res = await api.askChatbot({
      query: text,
      userId: user?.email || "demo-patient-001",
      language: language === "tw" ? "twi" : "english",
    });

    setLoading(false);

    if (res && res.success && res.data) {
      const ansEn = res.data.answerEnglish || res.data.response || res.data.answer || res.data.message;
      const ansTw = res.data.answerTwi || res.data.twiResponse;

      let responseText = "";
      if (language === "tw" && ansTw) {
        responseText = `${ansTw}\n\n(English: ${ansEn || "See guidance above."})`;
      } else {
        responseText = ansEn ? `${ansEn}\n\n(Twi: ${ansTw || "Di nnuane pa na kɔ asopiti."})` : (ansTw || "Thank you for asking. Please consult a health provider for urgent concerns.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: responseText,
          twiText: ansTw,
          englishText: ansEn,
          triageLevel: res.data.triageLevel || res.data.urgency,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: "I'm having trouble connecting to the medical AI service right now. Please ensure your connection is active or try again shortly.",
        },
      ]);
    }
  };

  const playSpeech = (msgId, text, lang = 'en') => {
    setPlayingId(`${msgId}-${lang}`);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingId(null), 2500);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser yet. Try Chrome on Android or desktop.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "tw" ? "ak-GH" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSendQuery(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] px-4 max-w-md mx-auto text-[#2D231E]">
      {/* Language Header Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-[#EBE3D7] text-xs">
        <span className="text-[#7A6B63] font-semibold">Language / Kasa:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-full font-bold transition-all ${
              language === "en" ? "bg-[#E07A5F] text-white shadow-sm" : "bg-white text-[#2D231E] border border-[#EBE3D7]"
            }`}
          >
            English (Simple)
          </button>
          <button
            onClick={() => setLanguage("tw")}
            className={`px-3 py-1.5 rounded-full font-bold transition-all ${
              language === "tw" ? "bg-[#E07A5F] text-white shadow-sm" : "bg-white text-[#2D231E] border border-[#EBE3D7]"
            }`}
          >
            Twi (Akan)
          </button>
        </div>
      </div>

      {/* Preset Q&A Prompt Chips Carousel (Low-Literacy UI) */}
      <div className="py-2.5 overflow-x-auto flex gap-2 no-scrollbar border-b border-[#EBE3D7]">
        {presetPromptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(chip.query)}
            className="px-3 py-1.5 rounded-full bg-white border border-[#EBE3D7] text-xs font-semibold text-[#2D231E] hover:border-[#E07A5F] whitespace-nowrap shrink-0 shadow-xs"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl p-4 whitespace-pre-line text-sm shadow-xs ${
                m.role === "user"
                  ? "bg-[#E07A5F] text-white rounded-tr-xs"
                  : "bg-white border border-[#EBE3D7] text-[#2D231E] rounded-tl-xs"
              }`}
            >
              <p>{m.text}</p>
              
              {/* Voice Playback Controls for Assistant */}
              {m.role === "assistant" && (
                <div className="mt-3 pt-2.5 border-t border-[#EBE3D7] flex items-center gap-2">
                  <button
                    onClick={() => playSpeech(m.id, m.englishText || m.text, 'en')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all ${
                      playingId === `${m.id}-en`
                        ? "bg-[#E07A5F] text-white border-[#E07A5F] animate-pulse"
                        : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                    }`}
                  >
                    🔊 English (en-GH)
                  </button>

                  <button
                    onClick={() => playSpeech(m.id, m.twiText || m.text, 'tw')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all ${
                      playingId === `${m.id}-tw`
                        ? "bg-[#81B29A] text-white border-[#81B29A] animate-pulse"
                        : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                    }`}
                  >
                    🔊 Khaya Twi Audio
                  </button>
                </div>
              )}

              {m.triageLevel === "RED" && (
                <div className="mt-2 text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  🚨 Emergency Warning: Proceed immediately to the nearest GHS health center or dial 112.
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#EBE3D7] rounded-2xl p-4 text-[#2D231E] flex items-center gap-2 text-xs font-semibold shadow-xs">
              <span className="w-4 h-4 rounded-full border-2 border-[#E07A5F] border-t-transparent animate-spin" />
              <span>Consulting Lily Guided RAG & Khaya AI Gateway...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar & Audio Recording */}
      <div className="pb-3 flex flex-col gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={language === "tw" ? "Bisa asem bi fa apɔmuden ho..." : "Type maternal or child health question..."}
            className="flex-1 h-12 px-4 rounded-2xl bg-white border border-[#EBE3D7] text-[#2D231E] text-sm focus:outline-none focus:border-[#E07A5F] shadow-xs"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-[#E07A5F] text-white flex items-center justify-center disabled:opacity-50 shadow-sm active:scale-95 transition-transform"
          >
            ➔
          </button>
        </form>

        {/* 16kHz WAV Speech Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={startListening}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
              listening ? "bg-red-500 text-white animate-bounce" : "bg-[#3D405B] text-white"
            }`}
          >
            <span className="text-2xl">🎙️</span>
          </button>
          <p className="text-[11px] text-[#7A6B63] mt-1 text-center font-medium">
            {listening ? "Recording 16kHz Mono WAV (Khaya ASR)..." : "Tap mic to speak Twi or English"}
          </p>
        </div>
      </div>
    </div>
  );
}