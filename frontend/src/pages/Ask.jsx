import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { api } from "../services/api.js";
import { playNeuralSpeech, stopNeuralSpeech } from "../services/speech.js";
import { startVoiceRecording, stopVoiceRecording } from "../services/voiceRecorder.js";
import { Mic, Volume2, Square, Settings, Send } from "lucide-react";

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

const DEFAULT_GREETING = {
  id: 1,
  role: "assistant",
  en: "Hi, I'm here to help. Ask me anything about your pregnancy or your baby in your preferred language.",
  twi: "Akwaaba! Mewɔ ha sɛ meboa wo. Bisa me biribiara fa wo abɔdeɛ anaa wo ba ho asɛm.",
};

export default function Ask() {
  const { lang, voiceLang } = useLang();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const activeUid = user?.id || (typeof window !== "undefined" && localStorage.getItem("mama_ba_active_user_id")) || "guest";
  const chatStoreKey = `mama_ba_usr_${activeUid}_chat_history`;

  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(chatStoreKey);
      return stored ? JSON.parse(stored) : [DEFAULT_GREETING];
    } catch {
      return [DEFAULT_GREETING];
    }
  });

  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const [currentlySpeaking, setCurrentlySpeaking] = useState(null);
  const [loading, setLoading] = useState(false);
  const activeRecorderRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    // Slight delay so React has painted the new message before scrolling
    const id = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
    return () => clearTimeout(id);
  }, [messages]);

  // Reload chat history if active user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(chatStoreKey);
      setMessages(stored ? JSON.parse(stored) : [DEFAULT_GREETING]);
    } catch {
      setMessages([DEFAULT_GREETING]);
    }
  }, [activeUid, chatStoreKey]);

  // Persist messages to active user's storage
  useEffect(() => {
    try {
      if (messages && messages.length > 0) {
        localStorage.setItem(chatStoreKey, JSON.stringify(messages));
      }
    } catch {
      /* ignore */
    }
  }, [messages, chatStoreKey]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopNeuralSpeech();
      stopVoiceRecording(activeRecorderRef.current);
    };
  }, []);

  const speakText = (text, languageKey, audioId) => {
    if (currentlySpeaking === audioId) {
      stopNeuralSpeech();
      setCurrentlySpeaking(null);
      return;
    }

    stopNeuralSpeech();
    playNeuralSpeech(
      text,
      languageKey,
      () => setCurrentlySpeaking(audioId),
      () => setCurrentlySpeaking(null),
      () => setCurrentlySpeaking(null)
    );
  };

  const processUserQuery = async (queryText) => {
    if (!queryText || !queryText.trim()) return;

    const userText = queryText.trim();
    const userMsgId = Date.now();
    const newAssisId = userMsgId + 1;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", en: userText, twi: userText },
    ]);

    setLoading(true);

    try {
      const res = await api.askChatbot({ query: userText, language: voiceLang, userId: activeUid });
      
      let assistTextEn = "Thanks for your question. Here is supportive guidance tailored for your journey.";
      let assistTextTwi = "Meda wo ase wɔ wo asɛm ho. Yɛwɔ afotu pa a ɛbɛboa wo abɔdeɛ mu.";

      if (res && res.success && res.data) {
        assistTextEn = res.data.answerEnglish || res.data.response || assistTextEn;
        assistTextTwi = res.data.answerTwi || assistTextTwi;
      }

      setLoading(false);

      // ── Progressive Line-by-Line Streaming Output ─────────────────────────
      const enLines = assistTextEn.split("\n");
      const twiLines = assistTextTwi.split("\n");
      const totalSteps = Math.max(enLines.length, twiLines.length);

      // Create initial empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: newAssisId, role: "assistant", en: "", twi: "" },
      ]);

      let step = 0;
      const streamInterval = setInterval(() => {
        step++;
        const currentEn = enLines.slice(0, step).join("\n");
        const currentTwi = twiLines.slice(0, step).join("\n");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newAssisId
              ? { ...msg, en: currentEn, twi: currentTwi }
              : msg
          )
        );

        if (step >= totalSteps) {
          clearInterval(streamInterval);
          // Trigger speech playback when streaming completes
          speakText(
            voiceLang === "twi" ? assistTextTwi : assistTextEn,
            voiceLang === "twi" ? "ak" : "en",
            newAssisId
          );
        }
      }, 50);

    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: newAssisId,
          role: "assistant",
          en: "I'm having trouble connecting right now, but please stay hydrated and rest.",
          twi: "Mewɔ ɔhaw kakra mu, nso kɔ so nom nsuo na gye wo ho ahome.",
        },
      ]);
    }
  };

  const addQuestion = (q) => {
    const userText = voiceLang === "twi" ? q.twi : q.en;
    processUserQuery(userText);
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      const q = inputText;
      setInputText("");
      processUserQuery(q);
    }
  const toggleListening = async () => {
    stopNeuralSpeech();
    setCurrentlySpeaking(null);

    if (listening) {
      stopVoiceRecording(activeRecorderRef.current);
      setListening(false);
      return;
    }

    const recorder = await startVoiceRecording({
      voiceLang,
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: (msg) => {
        setListening(false);
        if (msg) {
          addNotification({
            type: "reminder",
            titleEn: "Microphone Access Needed",
            titleTwi: "Microphone Kasa Ho Ban",
            bodyEn: "Please allow microphone access in your browser settings to speak your question.",
            bodyTwi: "Paa cho bra kɔ browser settings mu na fa permission ma microphone no.",
          });
        }
      },
      onResult: (transcript) => {
        setListening(false);
        processUserQuery(transcript);
      },
    });

    activeRecorderRef.current = recorder;
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-4.25rem)] max-w-lg mx-auto overflow-hidden">
      {/* Voice Assistant Language Badge & Switcher shortcut */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant text-xs shrink-0 bg-background/80 backdrop-blur-sm z-10">
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
                stopNeuralSpeech();
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

      {/* Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-4 py-4 pb-48">
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

        {/* Loading Dots Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <span className="text-xs text-on-surface-variant ml-1 font-medium">
                {voiceLang === "twi" ? "Mama Ba reti..." : "Mama Ba is thinking..."}
              </span>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={bottomRef} className="shrink-0 h-0" />
      </div>

      {/* Static Fixed Bottom Panel (Input bar + Preset chips) */}
      <div
        style={{
          bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 3.6rem), 3.6rem)",
        }}
        className="fixed inset-x-0 mx-auto w-full md:max-w-md px-4 pt-2 pb-2 bg-background/95 backdrop-blur-md z-30 flex flex-col gap-2 border-t border-outline-variant/30 shadow-md"
      >
        {/* Preset Q&A Chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
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

        {/* Audio Recording & Text Input Bar */}
        <form onSubmit={handleSendText} className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/80 rounded-full px-3.5 py-2 shadow-sm focus-within:border-primary transition-colors">
          {listening ? (
            <div className="flex items-center gap-0.5 h-6 px-2 flex-1">
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
              <span className="text-xs text-error font-medium ml-2">
                {voiceLang === "twi" ? "Mete wo Twi kasa..." : "Listening to English..."}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                voiceLang === "twi"
                  ? "Twerɛ anaa kyerɛ wo asɛm (e.g. Kontomire)..."
                  : "Type or speak your question in English or Twi..."
              }
              className="flex-1 bg-transparent px-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            />
          )}

          {inputText.trim() || listening ? (
            <button
              type={listening ? "button" : "submit"}
              onClick={listening ? toggleListening : undefined}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform shrink-0"
              aria-label="Send query"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleListening}
              aria-label={voiceLang === "twi" ? "Bisa asɛm wɔ Twi mu" : "Ask a question in English"}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}