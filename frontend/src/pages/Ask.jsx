import { useRef, useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const PRESET_QUESTIONS = [
  {
    en: "What local Ghanaian foods give iron during pregnancy?",
    twi: "Aduane bɛn na ɛma dadeɛ/mogya berɛ a wɔnyem?",
  },
  {
    en: "What are the danger signs of pre-eclampsia?",
    twi: "Pre-eclampsia ho nsɛnkyerɛnneɛ a ɛyɛ hu bɛn na wɔwɔ?",
  },
  {
    en: "Can I drink Taabea while taking antibiotics?",
    twi: "Metumi anom Taabea na metwam antibiotics?",
  },
  {
    en: "What vaccines does my newborn baby need?",
    twi: "Abofra foforo hiaduro foforo bɛn na ɛhia?",
  },
];

function encodeWavBlob(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

let activeAudioPlayer = null;

export default function Ask() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [audioState, setAudioState] = useState({ key: null, status: null });

  const playSpeech = async (msgId, text, langType) => {
    const audioKey = `${msgId}-${langType}`;

    if (audioState.key === audioKey) {
      if (activeAudioPlayer) {
        activeAudioPlayer.pause();
        activeAudioPlayer = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setAudioState({ key: null, status: null });
      return;
    }

    if (activeAudioPlayer) {
      activeAudioPlayer.pause();
      activeAudioPlayer = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const targetText = text || (langType === "twi" ? "Akwaaba! Mema wo apɔmuden pa." : "Welcome to Guided Companion.");
    const cleanText = String(targetText)
      .replace(/<[^>]*>/g, "")
      .replace(/[*_#`~]/g, "")
      .trim();

    if (!cleanText) {
      setAudioState({ key: null, status: null });
      return;
    }

    setAudioState({ key: audioKey, status: "loading" });

    const isTwi = langType === "twi" || langType === "tw" || langType === "ak";
    const preferredVoice = isTwi ? "abena_twi_high" : "akua_eng";

    try {
      const res = await api.synthesizeSpeech({
        text: cleanText,
        language: isTwi ? "tw" : "en",
        voice: preferredVoice
      });

      if (res && res.success && res.blob && res.blob.size > 200) {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        const audioUrl = URL.createObjectURL(res.blob);
        const audio = new Audio(audioUrl);
        activeAudioPlayer = audio;

        setAudioState({ key: audioKey, status: "playing" });

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (activeAudioPlayer === audio) activeAudioPlayer = null;
          setAudioState({ key: null, status: null });
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          if (activeAudioPlayer === audio) activeAudioPlayer = null;
          setAudioState({ key: null, status: null });
        };
        await audio.play().catch((err) => {
          console.warn('[Ask] Audio element play error:', err);
          setAudioState({ key: null, status: null });
        });
        return;
      }
    } catch (e) {
      console.warn('[Ask] Speech synthesis API notice:', e);
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utt = new SpeechSynthesisUtterance(cleanText);
      utt.lang = isTwi ? "en-GH" : "en-US";
      utt.rate = 0.95;
      utt.onend = () => setAudioState({ key: null, status: null });
      utt.onerror = () => setAudioState({ key: null, status: null });
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
      setAudioState({ key: audioKey, status: "playing" });
    } else {
      setAudioState({ key: null, status: null });
    }
  };
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      en: "Akwaaba! I am Mama Ba, your guided health companion. Ask me any maternal or child health question in English or Twi.",
      twi: "Akwaaba! Me din de Mama Ba. Bisa me biribiara fa wo apɔmuden anaa wo ba ho wɔ Twi anaa Borɔfo mu.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleSendQuery = async (queryText) => {
    const text = queryText || inputText;
    if (!text.trim() || loading) return;

    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", en: text, twi: text },
    ]);
    setInputText("");
    setLoading(true);

    const res = await api.askChatbot({
      query: text,
      userId: user?.email || "demo-patient-001",
      language: lang === "twi" ? "twi" : "english",
    });

    setLoading(false);

    if (res && res.success && res.data) {
      const ansEn = res.data.answerEnglish || res.data.response || res.data.answer || "Please consult a healthcare worker.";
      const ansTw = res.data.answerTwi || res.data.twiResponse || "Di nnuane pa na kɔ asopiti ntɛm.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          en: ansEn,
          twi: ansTw,
          triageLevel: res.data.triageLevel,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          en: "I'm having trouble connecting to the medical AI service right now. Please ensure your backend is active or try again shortly.",
          twi: "Mitumi nni nkitahodi ne apɔmuden AI som faako seesei. Yɛsrɛ wo san yɛ bio.",
        },
      ]);
    }
  };

      const audioContextRef = useRef(null);
      const audioStreamRef = useRef(null);
      const audioSamplesRef = useRef([]);
      const scriptProcessorRef = useRef(null);

  const toggleListening = async () => {
    if (listening) {
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setListening(false);

      const rawSamples = audioSamplesRef.current;
      if (!rawSamples || rawSamples.length === 0) return;

      let totalLen = 0;
      for (const chunk of rawSamples) totalLen += chunk.length;
      const mergedSamples = new Float32Array(totalLen);
      let offset = 0;
      for (const chunk of rawSamples) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }

      if (mergedSamples.length < 8000) {
        console.warn('[Ask] Audio recording too short.');
        return;
      }

      const wavBlob = encodeWavBlob(mergedSamples, 16000);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        setLoading(true);
        try {
          const res = await api.transcribeVoice({
            audio_base64: base64Audio,
            language: lang === 'twi' ? 'twi-only' : 'twi-en'
          });
          setLoading(false);
          if (res && res.success && res.transcription) {
            handleSendQuery(res.transcription);
          } else if (res && res.error) {
            alert(res.error);
          }
        } catch (err) {
          setLoading(false);
          console.warn('[Ask] Abena ASR error:', err);
        }
      };
      reader.readAsDataURL(wavBlob);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioSamplesRef.current = [];

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioSamplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setListening(true);
    } catch (err) {
      console.warn('[Ask] Microphone access error:', err);
      alert('Microphone permission is required to record Ghanaian voice.');
    }
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
              <p className="text-sm leading-relaxed whitespace-pre-line">{lang === "twi" ? m.twi : m.en}</p>

              {/* Bilingual secondary for assistant messages */}
              {m.role === "assistant" && (
                <>
                  <div className="mt-2 pt-2 border-t border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant leading-relaxed italic">
                      {lang === "twi" ? m.en : m.twi}
                    </p>
                  </div>
                  {/* Playback buttons */}
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => playSpeech(m.id, m.en, "en")}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border transition-all duration-200 ${
                        audioState.key === `${m.id}-en` && audioState.status === "playing"
                          ? "bg-primary text-on-primary border-primary shadow-xs font-semibold scale-95"
                          : audioState.key === `${m.id}-en` && audioState.status === "loading"
                          ? "bg-primary-container text-primary border-primary animate-pulse font-semibold"
                          : "bg-primary-container/20 text-primary border-primary/20 hover:bg-primary-container/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {audioState.key === `${m.id}-en` && audioState.status === "loading"
                          ? "progress_activity"
                          : audioState.key === `${m.id}-en` && audioState.status === "playing"
                          ? "equalizer"
                          : "volume_up"}
                      </span>
                      {audioState.key === `${m.id}-en` && audioState.status === "loading"
                        ? "Loading EN..."
                        : audioState.key === `${m.id}-en` && audioState.status === "playing"
                        ? "Playing EN..."
                        : "EN-GH Audio"}
                    </button>

                    <button
                      type="button"
                      onClick={() => playSpeech(m.id, m.twi, "twi")}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border transition-all duration-200 ${
                        audioState.key === `${m.id}-twi` && audioState.status === "playing"
                          ? "bg-tertiary text-on-tertiary border-tertiary shadow-xs font-semibold scale-95"
                          : audioState.key === `${m.id}-twi` && audioState.status === "loading"
                          ? "bg-tertiary-container text-tertiary border-tertiary animate-pulse font-semibold"
                          : "bg-tertiary-container/20 text-tertiary border-tertiary/20 hover:bg-tertiary-container/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {audioState.key === `${m.id}-twi` && audioState.status === "loading"
                          ? "progress_activity"
                          : audioState.key === `${m.id}-twi` && audioState.status === "playing"
                          ? "equalizer"
                          : "volume_up"}
                      </span>
                      {audioState.key === `${m.id}-twi` && audioState.status === "loading"
                        ? "Loading Twi..."
                        : audioState.key === `${m.id}-twi` && audioState.status === "playing"
                        ? "Playing Twi..."
                        : "Twi Audio"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {/* 3 Rippling Dots Thinking Indicator Note */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 py-3 text-on-surface flex items-center gap-2.5 text-xs font-semibold shadow-xs">
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
              </div>
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
              onClick={() => handleSendQuery(lang === "twi" ? q.twi : q.en)}
              className="shrink-0 bg-primary-container/20 text-on-surface border border-primary/20 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary-container/40 transition-colors max-w-[200px] text-left leading-snug"
            >
              {lang === "twi" ? q.twi : q.en}
            </button>
          ))}
        </div>

        {/* Text Input & Mic Form */}
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
            placeholder={lang === "twi" ? "Bisa asɛm bi..." : "Type health question..."}
            className="flex-1 h-12 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={toggleListening}
            aria-label="Voice input"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
              listening ? "bg-error text-on-error animate-pulse" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">mic</span>
          </button>
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-50 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">send</span>
          </button>
        </form>

        {/* Disclaimer */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-outline text-[16px] shrink-0 mt-0.5">info</span>
          <p className="text-xs text-outline">
            {lang === "twi"
              ? "Mama Ba ma nsɛm a ɛfata. Kɔ onyansafo wɔ asiane mu."
              : "Mama Ba provides general guidance. Always consult a doctor for serious concerns."}
          </p>
        </div>
      </div>
    </div>
  );
}