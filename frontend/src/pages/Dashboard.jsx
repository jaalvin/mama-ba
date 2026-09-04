import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { medications as medsAPI, api } from "../services/api.js";
import { showDeviceNotification, scheduleAlarm, nextOccurrenceMs } from "../services/notifications.js";
import { playNeuralSpeech, stopNeuralSpeech } from "../services/speech.js";
import { startVoiceRecording, stopVoiceRecording } from "../services/voiceRecorder.js";
import { getTodayTip } from "../services/tipScheduler.js";
import { supabase } from "../lib/supabase.js";
import {
  Baby, Leaf, HelpCircle, HeartPulse, MapPin,
  ChevronRight, Mic, Check, Clock, Plus, Trash2, Loader2,
  Calendar, CalendarCheck, X, Square, Volume2, MicOff,
} from "lucide-react";

// ── Daily checked-med persistence helpers ──────────────────────────────────
function todayKey(uid) {
  const d = new Date().toISOString().split("T")[0];
  return `mama_ba_usr_${uid || "guest"}_meds_taken_${d}`;
}
function loadCheckedToday(uid) {
  try { return JSON.parse(localStorage.getItem(todayKey(uid))) ?? []; } catch { return []; }
}
function saveCheckedToday(uid, ids) {
  try { localStorage.setItem(todayKey(uid), JSON.stringify(ids)); } catch { /* ignore */ }
}

// Baby size lookup by gestational week
const BABY_SIZE = {
  4: { en: "a poppy seed", twi: "abɔ ketewa" },
  8: { en: "a raspberry", twi: "afrow" },
  12: { en: "a lime", twi: "ankaa ketewa" },
  16: { en: "an avocado", twi: "apɛrɛkɔ" },
  20: { en: "a banana", twi: "kwadu" },
  24: { en: "an ear of corn", twi: "aburoɔ" },
  28: { en: "an eggplant", twi: "ntroba" },
  32: { en: "a squash", twi: "aboɔ" },
  36: { en: "a honeydew melon", twi: "kwadu kesee" },
  40: { en: "a small watermelon", twi: "ɛkuankoa" },
};

function getBabySize(week) {
  if (!week) return null;
  const keys = Object.keys(BABY_SIZE).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, cur) =>
    Math.abs(cur - week) < Math.abs(prev - week) ? cur : prev
  );
  return BABY_SIZE[closest];
}

function computeWeek(dueDate) {
  if (!dueDate) return null;
  const msLeft = new Date(dueDate) - new Date();
  const weeksLeft = Math.max(0, Math.round(msLeft / (7 * 24 * 60 * 60 * 1000)));
  return Math.min(40, Math.max(1, 40 - weeksLeft));
}

function computeDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const msLeft = new Date(dueDate) - new Date();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export default function Dashboard() {
  const { user, updateUser, accessToken } = useAuth();
  const { lang } = useLang();
  const { addNotification } = useNotifications();
  const name = user?.name || (lang === "twi" ? "Ɛho" : "there");

  const week    = computeWeek(user?.dueDate);
  const size    = getBabySize(week);
  const daysLeft = computeDaysRemaining(user?.dueDate);
  const progressPercent = week ? Math.min(100, Math.round((week / 40) * 100)) : 0;
  const dashOff = week ? 251.2 - (week / 40) * 251.2 : 251.2;

  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [modalDueDate, setModalDueDate] = useState(user?.dueDate || "");

  // ── Inline Voice Chat State ────────────────────────────────────────────────
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [vcListening, setVcListening] = useState(false);
  const [vcThinking, setVcThinking] = useState(false);
  const [vcSpeaking, setVcSpeaking] = useState(false);
  const [vcTranscript, setVcTranscript] = useState("");
  const [vcReply, setVcReply] = useState({ en: "", twi: "" });
  const [vcError, setVcError] = useState("");
  const vcRecorderRef = useRef(null);
  const { voiceLang } = useLang();

  // Medications
  const activeUid = user?.id || localStorage.getItem("mama_ba_active_user_id") || "guest";
  const [meds, setMeds]           = useState([]);
  const [medsLoading, setMedsLoading] = useState(true);
  const [checked, setChecked]     = useState(() => loadCheckedToday(activeUid));
  const [addOpen, setAddOpen]     = useState(false);
  const [medName, setMedName]     = useState("");
  const [medTime, setMedTime]     = useState("");
  const [saving, setSaving]       = useState(false);

  // Alarm cleanup refs: map of medId → cancel function
  const alarmCancellers = useRef({});

  // ── Load medications (always load from local cache; token used for remote sync) ──
  const loadMeds = useCallback(() => {
    setMedsLoading(true);
    medsAPI.list(accessToken)
      .then(setMeds)
      .catch(() => setMeds([]))
      .finally(() => setMedsLoading(false));
  }, [accessToken]);

  useEffect(() => { loadMeds(); }, [loadMeds]);

  // Persist checked state to localStorage daily
  useEffect(() => {
    saveCheckedToday(activeUid, checked);
  }, [checked, activeUid]);

  // ── Schedule / reschedule alarms whenever med list changes ─────────────────
  useEffect(() => {
    // Cancel all existing alarms
    Object.values(alarmCancellers.current).forEach(fn => fn?.());
    alarmCancellers.current = {};

    meds.forEach((med) => {
      if (!med.time) return;
      try {
        const targetMs = nextOccurrenceMs(med.time);
        const cancel = scheduleAlarm(
          targetMs,
          lang === "twi" ? "Nnuro Bere!" : "Medication Time!",
          lang === "twi"
            ? `Bere a wubegye wo nnuro – ${med.label}`
            : `Time to take ${med.label}`
        );
        alarmCancellers.current[med.id] = cancel;

        // Also queue an in-app notification at the same time
        const delay = targetMs - Date.now();
        const inAppId = setTimeout(() => {
          addNotification({
            type: "reminder",
            titleEn: "Medication Time!",
            titleTwi: "Nnuro Bere!",
            bodyEn: `Time to take ${med.label}`,
            bodyTwi: `Bere a wubegye wo nnuro – ${med.label}`,
          });
        }, delay);

        // Store both cancellers
        const prevCancel = alarmCancellers.current[med.id];
        alarmCancellers.current[med.id] = () => {
          prevCancel?.();
          clearTimeout(inAppId);
        };
      } catch {
        /* ignore malformed time strings */
      }
    });

    return () => {
      Object.values(alarmCancellers.current).forEach(fn => fn?.());
    };
  }, [meds, lang, addNotification]);

  const toggleMed = (id) =>
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveCheckedToday(activeUid, next);
      return next;
    });

  const handleAddMed = async (e) => {
    e.preventDefault();
    if (!medName.trim() || !medTime.trim()) return;
    setSaving(true);
    try {
      const item = await medsAPI.create(accessToken, { label: medName.trim(), time: medTime.trim() });
      setMeds((prev) => [...prev, item]);
      setMedName(""); setMedTime(""); setAddOpen(false);

      // Immediate confirmation notification
      showDeviceNotification(
        lang === "twi" ? "Nnuro Fa Ho" : "Medication Added",
        lang === "twi"
          ? `${item.label} – wobɛkae wo sɛ wubegye ${item.time}`
          : `${item.label} — you'll be reminded at ${item.time}`
      );
      addNotification({
        type: "reminder",
        titleEn: "Medication Added",
        titleTwi: "Nnuro Fa Ho",
        bodyEn: `${item.label} — you'll be reminded daily at ${item.time}`,
        bodyTwi: `${item.label} – wobɛkae wo sɛ wubegye ${item.time}`,
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Restore / Sync Due Date across Home screen and Profile ─────────────────
  useEffect(() => {
    if (!activeUid || activeUid === "guest") return;
    const stored = localStorage.getItem(`mama_ba_usr_${activeUid}_due_date`);
    if (stored && stored !== user?.dueDate) {
      updateUser({ dueDate: stored });
      setModalDueDate(stored);
    } else if (user?.dueDate) {
      setModalDueDate(user.dueDate);
    }
  }, [activeUid, user?.dueDate]);

  const handleDeleteMed = async (id) => {
    // Cancel the alarm for this med
    alarmCancellers.current[id]?.();
    delete alarmCancellers.current[id];

    await medsAPI.remove(accessToken, id);
    setMeds((prev) => prev.filter(m => m.id !== id));
    setChecked((prev) => prev.filter(x => x !== id));
  };

  const handleSaveModalDueDate = async (e) => {
    e.preventDefault();
    if (!modalDueDate) return;
    if (activeUid) {
      localStorage.setItem(`mama_ba_usr_${activeUid}_due_date`, modalDueDate);
    }
    updateUser({ dueDate: modalDueDate });
    try {
      if (supabase && activeUid) {
        await supabase.from("user_profile").upsert({
          user_id: activeUid,
          due_date: modalDueDate,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } catch (err) {
      console.warn("[Dashboard] Due date sync notice:", err);
    }
    setShowDueDateModal(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mama_ba_voice_chat_toggle", { detail: { open: voiceChatOpen } }));
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mama_ba_voice_chat_toggle", { detail: { open: false } }));
      }
    };
  }, [voiceChatOpen]);
  const closeVoiceChat = () => {
    stopNeuralSpeech();
    stopVoiceRecording(vcRecorderRef.current);
    vcRecorderRef.current = null;
    setVoiceChatOpen(false);
    setVcListening(false);
    setVcThinking(false);
    setVcSpeaking(false);
    setVcTranscript("");
    setVcReply({ en: "", twi: "" });
    setVcError("");
  };

  const vcStartListening = async () => {
    if (vcListening || vcThinking || vcSpeaking) return;
    stopNeuralSpeech();
    setVcError("");
    setVcTranscript("");
    setVcReply({ en: "", twi: "" });
    setVcSpeaking(false);
    setVcListening(true);

    try {
      const recorder = await startVoiceRecording({
        voiceLang,
        onStart: () => setVcListening(true),
        onEnd: () => setVcListening(false),
        onError: (msg) => {
          setVcListening(false);
          setVcError(msg);
        },
        onResult: async (transcript) => {
          setVcListening(false);
          setVcTranscript(transcript);
          setVcThinking(true);

          try {
            const activeUid = user?.id || localStorage.getItem("mama_ba_active_user_id") || "guest";
            const res = await api.askChatbot({ query: transcript, language: voiceLang, userId: activeUid });

            let replyEn = "I'm here to help. Please try asking again.";
            let replyTwi = "Mewɔ ha sɛ meboa wo. Xowa bisa bio.";

            if (res && res.success && res.data) {
              replyEn = res.data.answerEnglish || res.data.response || replyEn;
              replyTwi = res.data.answerTwi || replyTwi;
            }

            setVcThinking(false);
            setVcReply({ en: replyEn, twi: replyTwi });

            // Speak the reply in the active voice language
            const textToSpeak = voiceLang === "twi" ? replyTwi : replyEn;
            const langCode = voiceLang === "twi" ? "ak" : "en";
            setVcSpeaking(true);
            playNeuralSpeech(
              textToSpeak,
              langCode,
              () => setVcSpeaking(true),
              () => setVcSpeaking(false),
              () => setVcSpeaking(false)
            ).catch(() => setVcSpeaking(false));
          } catch (err) {
            setVcThinking(false);
            setVcError("Connection issue. Please try again.");
          }
        },
      });

      vcRecorderRef.current = recorder;
    } catch (err) {
      setVcListening(false);
      setVcError("Could not access microphone.");
    }
  };

  const vcStopListening = () => {
    stopVoiceRecording(vcRecorderRef.current);
    vcRecorderRef.current = null;
    setVcListening(false);
  };

  const vcStopSpeaking = () => {
    stopNeuralSpeech();
    setVcSpeaking(false);
  };

  return (
    <div className="px-4 py-6 md:px-6 flex flex-col gap-6 max-w-lg mx-auto pb-24">

      {/* ═══ HERO PREGNANCY PROGRESS RING SECTION ═══ */}
      <section className="flex flex-col items-center text-center gap-2">
        {/* Circular Progress Display */}
        <div
          onClick={() => !week && setShowDueDateModal(true)}
          className={`relative w-40 h-40 mb-1 flex items-center justify-center transition-transform ${
            !week ? "cursor-pointer hover:scale-105 active:scale-95" : ""
          }`}
          title={!week ? "Tap to add your due date" : `Week ${week} of 40 (${progressPercent}%)`}
        >
          {/* SVG Progress Circle */}
          <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
            {/* Background track circle */}
            <circle
              className="text-surface-container-highest"
              cx="50"
              cy="50"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeWidth="7"
            />
            {/* Active progress arc based on due date */}
            {week && (
              <circle
                className="text-primary transition-all duration-1000 ease-out"
                cx="50"
                cy="50"
                fill="transparent"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray="251.2"
                strokeDashoffset={dashOff}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Center content inside the circular progress ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
            {week ? (
              <div className="flex flex-col items-center justify-center">
                {/* Pregnant woman badge with week number */}
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-0.5 shadow-inner">
                  <span className="material-symbols-outlined text-[20px] text-primary">pregnant_woman</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold font-headline leading-none text-primary">{week}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">/ 40</span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-primary font-bold mt-0.5">
                  {lang === "twi" ? "Nnawɔtwe" : "Weeks"}
                </span>
              </div>
            ) : (
              /* Circle around the pregnant woman icon when due date not set yet */
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-18 h-18 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary shadow-sm ring-4 ring-primary/5">
                  <span className="material-symbols-outlined text-4xl text-primary">pregnant_woman</span>
                </div>
                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  <span>Set Due Date</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Greeting & Progress Text */}
        <h1 className="font-headline text-headline-md text-on-surface">
          {lang === "twi" ? `Akwaaba, ${name}` : `Hello, ${name}`}
        </h1>

        {week && size ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-on-surface text-sm font-semibold">
              {lang === "twi" ? `Wo ba su sɛ ${size.twi}!` : `Your baby is the size of ${size.en}!`}
            </p>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {progressPercent}% {lang === "twi" ? "awie" : "completed"}
              </span>
              {daysLeft !== null && (
                <span>• {daysLeft === 0 ? "Due today!" : `${daysLeft} days remaining`}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
            <p className="text-on-surface-variant text-xs leading-relaxed">
              {lang === "twi"
                ? "Fa wo da a wobɛwoo no akye wo profile mu ma yɛnhyehyɛ wo nkɔsoɔ."
                : "Add your due date in your profile to see your pregnancy progress."}
            </p>
            <button
              onClick={() => setShowDueDateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === "twi" ? "Fa Wo Da Kyerɛ (Set Due Date)" : "Set Due Date Now"}</span>
            </button>
          </div>
        )}
      </section>

      {/* ═══ VOICE ASSISTANT MIC BUTTON ═══ */}
      <section className="flex flex-col items-center gap-3">
        <button
          onClick={() => { setVoiceChatOpen(true); }}
          aria-label={lang === "twi" ? "Bisa me biribiara" : "Ask me anything"}
          className="w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
        >
          <Mic className="w-10 h-10" strokeWidth={1.5} />
          {/* Pulse ring to show it's interactive */}
          <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
        </button>
        <p className="text-on-surface-variant text-sm font-semibold">
          {lang === "twi" ? "Bisa me biribiara (Ask Voice Assistant)" : "Ask me anything (Voice Assistant)"}
        </p>
      </section>

      {/* ═══ INLINE VOICE CHAT OVERLAY ═══ */}
      {voiceChatOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-end"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        >
          {/* Dismiss overlay on outside tap */}
          <div className="absolute inset-0" onClick={closeVoiceChat} />

          {/* Chat Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-t-3xl p-6 flex flex-col gap-5 shadow-2xl"
            style={{ minHeight: "56vh", maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-primary" />
                </span>
                <div>
                  <p className="font-bold text-sm text-on-surface leading-none">
                    {lang === "twi" ? "Mama Ba Voice" : "Mama Ba Voice"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {vcListening
                      ? (lang === "twi" ? "Mete wo kasa..." : "Listening...")
                      : vcThinking
                      ? (lang === "twi" ? "Meti wo asɛm..." : "Thinking...")
                      : vcSpeaking
                      ? (lang === "twi" ? "Meka..." : "Speaking...")
                      : (lang === "twi" ? "Bɔ mic no na bisa" : "Tap mic to ask")}
                  </p>
                </div>
              </div>
              <button
                onClick={closeVoiceChat}
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
              {/* User spoke transcript */}
              {vcTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-medium shadow-sm">
                    {vcTranscript}
                  </div>
                </div>
              )}

              {/* Thinking shimmer */}
              {vcThinking && (
                <div className="flex justify-start">
                  <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                    {[0.1, 0.2, 0.3].map((delay, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary"
                        style={{ animation: `bounce 0.9s ease-in-out ${delay}s infinite` }}
                      />
                    ))}
                    <span className="text-xs text-on-surface-variant ml-1">
                      {lang === "twi" ? "Meti..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Bot reply */}
              {(vcReply.en || vcReply.twi) && !vcThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-2 shadow-sm">
                    <p className="text-sm leading-relaxed text-on-surface font-medium">
                      {voiceLang === "twi" ? vcReply.twi : vcReply.en}
                    </p>
                    {/* Secondary language */}
                    <p className="text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/30 pt-1.5">
                      {voiceLang === "twi" ? vcReply.en : vcReply.twi}
                    </p>
                    {/* Stop speaking button */}
                    {vcSpeaking && (
                      <button
                        onClick={vcStopSpeaking}
                        className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/30 font-semibold animate-pulse"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>{lang === "twi" ? "Gyae" : "Stop Speaking"}</span>
                      </button>
                    )}
                    {!vcSpeaking && (vcReply.en || vcReply.twi) && (
                      <button
                        onClick={() => {
                          const textToSpeak = voiceLang === "twi" ? vcReply.twi : vcReply.en;
                          const langCode = voiceLang === "twi" ? "ak" : "en";
                          setVcSpeaking(true);
                          playNeuralSpeech(textToSpeak, langCode, () => setVcSpeaking(true), () => setVcSpeaking(false), () => setVcSpeaking(false));
                        }}
                        className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant hover:border-primary transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lang === "twi" ? "Ka Bio" : "Replay"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Welcome hint when nothing said yet */}
              {!vcTranscript && !vcThinking && !vcReply.en && (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-on-surface font-semibold">
                    {lang === "twi" ? "Bɔ mic no na bisa me biribiara" : "Tap the mic and ask me anything"}
                  </p>
                  <p className="text-xs text-on-surface-variant max-w-[220px]">
                    {lang === "twi"
                      ? "Mɛtie wo asɛm na mɛma wo afotu mu tɛ"
                      : "I'll listen, think, and speak my reply back to you"}
                  </p>
                </div>
              )}
            </div>

            {/* Mic Control Button */}
            <div className="flex flex-col items-center gap-3">
              {vcListening ? (
                <>
                  {/* Animated waveform while recording */}
                  <div className="flex items-end gap-0.5 h-8">
                    {[3, 5, 8, 5, 7, 4, 6, 3, 5, 8].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-error"
                        style={{
                          height: `${h * 3}px`,
                          animation: `pulse 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={vcStopListening}
                    className="w-20 h-20 rounded-full bg-error text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  >
                    <MicOff className="w-9 h-9" strokeWidth={1.5} />
                  </button>
                  <p className="text-xs text-error font-semibold">
                    {lang === "twi" ? "Tap sɛ wopɛ sɛ wotwi kasa no" : "Tap to stop recording"}
                  </p>
                </>
              ) : vcThinking ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-primary/40 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-9 h-9 text-primary animate-spin" />
                  </div>
                  <p className="text-xs text-on-surface-variant font-semibold">
                    {lang === "twi" ? "Mama Ba reti..." : "Mama Ba is thinking..."}
                  </p>
                </>
              ) : vcSpeaking ? (
                <>
                  <div className="flex items-end gap-1 h-10">
                    {[2, 4, 6, 8, 6, 4, 2].map((h, i) => (
                      <span
                        key={i}
                        className="w-2 rounded-full bg-primary"
                        style={{
                          height: `${h * 3}px`,
                          animation: `pulse 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={vcStopSpeaking}
                    className="w-20 h-20 rounded-full bg-primary/20 border-4 border-primary text-primary flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  >
                    <Square className="w-9 h-9 fill-current" />
                  </button>
                  <p className="text-xs text-primary font-semibold">
                    {lang === "twi" ? "Mama Ba reka..." : "Mama Ba is speaking..."}
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={vcStartListening}
                    aria-label={lang === "twi" ? "Bisa asɛm" : "Ask a question"}
                    className="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xl active:scale-95 hover:scale-105 transition-transform relative"
                  >
                    <Mic className="w-9 h-9" strokeWidth={1.5} />
                    {(vcReply.en || vcReply.twi) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-forest-green rounded-full border-2 border-surface-container-lowest" />
                    )}
                  </button>
                  <p className="text-xs text-on-surface-variant font-semibold">
                    {vcReply.en
                      ? (lang === "twi" ? "Bɔ bio sɛ wopɛ sɛ wobisa bio" : "Tap to ask a follow-up")
                      : (lang === "twi" ? "Bɔ mic no na bisa" : "Tap to speak")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <section>
        <h2 className="font-headline text-headline-md text-on-surface mb-3">
          {lang === "twi" ? "Yɛ biribi ntɛm" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Maternal & Baby Tracker */}
          <Link
            to="/app/maternal"
            className="rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center bg-[#fff3f0] border border-[#fcd7cf] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#fde5e0] border border-[#f9c7be] flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <Baby className="w-6 h-6 text-[#c24632]" strokeWidth={1.75} />
            </div>
            <span className="text-label-md text-[#2b2522] text-sm leading-tight font-semibold">
              {lang === "twi" ? "Maame & Ba" : "Maternal & Baby Tracker"}
            </span>
          </Link>

          {/* Card 2: Herbal & Medication Safety */}
          <Link
            to="/app/safety"
            className="rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center bg-[#f0f7f4] border border-[#cce4d8] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#e0f0e8] border border-[#b8dbc9] flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <Leaf className="w-6 h-6 text-[#2d6a4f]" strokeWidth={1.75} />
            </div>
            <span className="text-label-md text-[#2b2522] text-sm leading-tight font-semibold">
              {lang === "twi" ? "Afifide & Nnuro" : "Herbal & Medication Safety"}
            </span>
          </Link>

          {/* Card 3: Maternal Health FAQs */}
          <Link
            to="/app/triage"
            className="rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center bg-[#fff8ee] border border-[#fce4c4] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#fdedd7] border border-[#fbd8a8] flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <HelpCircle className="w-6 h-6 text-[#d97706]" strokeWidth={1.75} />
            </div>
            <span className="text-label-md text-[#2b2522] text-sm leading-tight font-semibold">
              {lang === "twi" ? "Nsɛmmisa (FAQs)" : "Maternal Health FAQs"}
            </span>
          </Link>

          {/* Card 4: Log Daily Vitals */}
          <Link
            to="/app/vitals"
            className="rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center bg-[#fdf2f8] border border-[#fbcfe8] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#fce7f3] border border-[#f8b4d9] flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <HeartPulse className="w-6 h-6 text-[#db2777]" strokeWidth={1.75} />
            </div>
            <span className="text-label-md text-[#2b2522] text-sm leading-tight font-semibold">
              {lang === "twi" ? "Gye Apomuden Nkae" : "Log Daily Vitals"}
            </span>
          </Link>

          {/* Card 5 Banner: Find Nearby Pharmacy */}
          <Link
            to="/app/care"
            className="col-span-2 rounded-2xl p-4 flex items-center gap-4 bg-[#faf4ee] border border-[#e8dccf] shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#ede1d3] border border-[#dccdc0] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6 text-[#a04a36]" strokeWidth={1.75} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span className="text-label-md text-[#2b2522] font-semibold block leading-tight">
                {lang === "twi" ? "Hwɛ Adwumakuw a Ɛbɛn Wo" : "Find Nearby Pharmacy"}
              </span>
              <span className="text-xs text-on-surface-variant/90 mt-0.5 block">
                {lang === "twi" ? "Ayaresabea ne Adwumakuw" : "Book appointments & order meds"}
              </span>
            </div>
            <ChevronRight className="ml-auto text-outline w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* ═══ TODAY'S MEDICATIONS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline text-headline-md text-on-surface">
            {lang === "twi" ? "Nnuro Ɛnnɛ" : "Today's Medications"}
          </h2>
          <button
            onClick={() => setAddOpen(o => !o)}
            aria-label={lang === "twi" ? "Fa nnuro" : "Add medication"}
            className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {addOpen && (
          <form onSubmit={handleAddMed} className="mb-3 ios-glass-card rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-on-surface">{lang === "twi" ? "Fa Nnuro Foforo" : "Add Medication"}</p>
            <input
              type="text" required
              placeholder={lang === "twi" ? "Nnuro din (e.g. Iron & Folic Acid)" : "Medication name (e.g. Iron & Folic Acid)"}
              value={medName} onChange={e => setMedName(e.target.value)}
              className="w-full bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <div>
              <label className="text-xs text-on-surface-variant mb-1 block">{lang === "twi" ? "Bere a wubegye" : "Time to take"}</label>
              <input
                type="time" required value={medTime} onChange={e => setMedTime(e.target.value)}
                className="w-full bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAddOpen(false); setMedName(""); setMedTime(""); }}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                {lang === "twi" ? "Gyae" : "Cancel"}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {lang === "twi" ? "Fa Ho" : "Save"}
              </button>
            </div>
          </form>
        )}

        <div className="ios-glass-card rounded-2xl overflow-hidden shadow-sm">
          {medsLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

          {!medsLoading && meds.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl opacity-40">medication</span>
              <p className="text-sm">{lang === "twi" ? "Nnuro biara nni hɔ" : "No medications added yet"}</p>
              <button onClick={() => setAddOpen(true)} className="text-xs text-primary font-semibold mt-1">
                + {lang === "twi" ? "Fa nnuro" : "Add one"}
              </button>
            </div>
          )}

          {!medsLoading && meds.length > 0 && (
            <div className="divide-y divide-outline-variant">
              {meds.map(med => (
                <div key={med.id} className="flex items-center gap-3 px-4 py-4">
                  <button onClick={() => toggleMed(med.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked.includes(med.id) ? "bg-forest-green border-forest-green" : "border-outline-variant"
                    }`}>
                    {checked.includes(med.id) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${checked.includes(med.id) ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                      {med.label}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {lang === "twi" ? `Gye ${med.time}` : `Take at ${med.time}`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteMed(med.id)} aria-label="Remove medication"
                    className="p-1.5 text-outline hover:text-error transition-colors rounded-full hover:bg-error/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ TODAY'S DAILY TIP ═══ */}
      {(() => {
        const todayTip = getTodayTip(lang);
        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline text-headline-md text-on-surface">
                {lang === "twi" ? "Afotu ma Wo Ɛnnɛ" : "Today's Daily Tip for You"}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {lang === "twi" ? `Da ${new Date().getDate()}` : `Day ${new Date().getDate()}`}
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="w-full h-44 bg-[#F8EFE6] relative overflow-hidden">
                <img src="https://media.istockphoto.com/id/2229743222/photo/pregnant-woman-in-therapy-session-mental-health-care.webp?a=1&b=1&s=612x612&w=0&k=20&c=SpsvNV36yQOW7rVv4C00R8KP8XiBzW8RVZwohmUKhOQ=" alt="Daily Wellness Tip" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <span className="text-sm font-bold text-[#964B22] flex items-center gap-1.5">
                  <span>{todayTip.title}</span>
                </span>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {todayTip.body}
                </p>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══ QUICK DUE DATE MODAL ═══ */}
      {showDueDateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDueDateModal(false)}
        >
          <div
            className="w-full max-w-sm bg-background border border-outline-variant rounded-3xl p-6 flex flex-col gap-4 shadow-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-headline font-bold text-base text-on-surface">
                  {lang === "twi" ? "Fa Wo Awoɔ Da Kyerɛ" : "Set Your Due Date"}
                </h2>
              </div>
              <button
                onClick={() => setShowDueDateModal(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {lang === "twi"
                ? "Fa da a wɔahyɛ sɛ wobɛwo no kyerɛ na yɛnkyerɛ wo ba no nkɔsoɔ wɔ fie ha."
                : "Enter your estimated delivery date to see how far your pregnancy has come."}
            </p>

            <form onSubmit={handleSaveModalDueDate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {lang === "twi" ? "Awoɔ Da (Due Date):" : "Estimated Due Date:"}
                </label>
                <input
                  type="date"
                  required
                  value={modalDueDate}
                  onChange={(e) => setModalDueDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDueDateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  {lang === "twi" ? "Gyae" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!modalDueDate}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{lang === "twi" ? "Kora So" : "Save Progress"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}