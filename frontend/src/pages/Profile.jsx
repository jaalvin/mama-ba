import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { supabase } from "../lib/supabase";
import {
  User,
  Calendar,
  Mic,
  Globe,
  PhoneCall,
  ShieldAlert,
  Lock,
  KeyRound,
  LogOut,
  ChevronRight,
  CheckCircle2,
  CalendarCheck,
  Camera,
  Sparkles,
} from "lucide-react";

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

function getTrimester(week) {
  if (!week) return null;
  if (week <= 13) return { en: "1st Trimester", twi: "Bɔbea 1 (Mfitiaseɛ)" };
  if (week <= 26) return { en: "2nd Trimester", twi: "Bɔbea 2 (Mfimfini)" };
  return { en: "3rd Trimester", twi: "Bɔbea 3 (Awoɔ bere)" };
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const {
    lang,
    setLang,
    voiceLang,
    setVoiceLang,
    stopSpeech,
    isSpeaking,
    speakingLanguage,
  } = useLang();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [dueDateInput, setDueDateInput]   = useState(user?.dueDate || "");
  const [savingDate, setSavingDate]       = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    const uid = user?.id || user?.userId || localStorage.getItem("mama_ba_active_user_id");
    return user?.avatarUrl || (uid ? localStorage.getItem(`mama_ba_usr_${uid}_avatar`) : null) || null;
  });

  useEffect(() => {
    const uid = user?.id || user?.userId || localStorage.getItem("mama_ba_active_user_id");
    if (!uid) return;
    const stored = user?.avatarUrl || localStorage.getItem(`mama_ba_usr_${uid}_avatar`);
    if (stored) setAvatarUrl(stored);
  }, [user?.id, user?.avatarUrl]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size should be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target.result;
      setAvatarUrl(dataUrl);
      const uid = user?.id || user?.userId || localStorage.getItem("mama_ba_active_user_id");
      if (uid) {
        localStorage.setItem(`mama_ba_usr_${uid}_avatar`, dataUrl);
      }
      updateUser({ avatarUrl: dataUrl });
      setNotificationMsg(
        lang === "twi" ? "Wo mfonini fɛfɛɛfɛ no asesa yie!" : "Profile picture updated successfully!"
      );
      setTimeout(() => setNotificationMsg(""), 3500);

      try {
        if (supabase && uid) {
          await supabase.from("user_profile").upsert(
            {
              user_id: uid,
              avatar_url: dataUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }
      } catch (err) {
        console.warn("[Profile] Avatar Supabase notice:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update input if user object updates
  useEffect(() => {
    if (user?.dueDate) {
      setDueDateInput(user.dueDate);
    }
  }, [user?.dueDate]);

  // Load due date from local storage or Supabase if not in local context
  useEffect(() => {
    const uid = user?.id || user?.userId || localStorage.getItem("mama_ba_active_user_id");
    if (!uid) return;
    const stored = localStorage.getItem(`mama_ba_usr_${uid}_due_date`);
    if (stored && stored !== user?.dueDate) {
      setDueDateInput(stored);
      updateUser({ dueDate: stored });
    } else if (user?.dueDate) {
      setDueDateInput(user.dueDate);
    } else {
      (async () => {
        try {
          if (!supabase) return;
          const { data } = await supabase
            .from("user_profile")
            .select("due_date")
            .eq("user_id", uid)
            .single();
          if (data?.due_date) {
            localStorage.setItem(`mama_ba_usr_${uid}_due_date`, data.due_date);
            setDueDateInput(data.due_date);
            updateUser({ dueDate: data.due_date });
          }
        } catch {}
      })();
    }
  }, [user?.id, user?.dueDate]);

  // Stop speech if navigating away
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  const handleSaveDueDate = async (e) => {
    e.preventDefault();
    if (!dueDateInput) return;
    setSavingDate(true);
    const uid = user?.id || user?.userId || localStorage.getItem("mama_ba_active_user_id");
    if (uid) {
      localStorage.setItem(`mama_ba_usr_${uid}_due_date`, dueDateInput);
    }
    // 1. Update in-memory context + localStorage
    updateUser({ dueDate: dueDateInput });
    // 2. Persist to Supabase user_profile
    try {
      if (supabase && uid) {
        await supabase.from("user_profile").upsert({
          user_id: uid,
          due_date: dueDateInput,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    } catch (err) {
      console.warn("[Profile] Due date Supabase sync notice:", err);
    }
    setTimeout(() => {
      setSavingDate(false);
      setNotificationMsg(
        lang === "twi"
          ? "Wo awoɔ da asi hɔ yie! Wo nyinsɛn nkɔsoɔ ayɛ krado."
          : "Due date saved! Your pregnancy progress ring is now active."
      );
      setTimeout(() => setNotificationMsg(""), 3500);
    }, 300);
  };

  const handleSelectActiveVoice = (vl) => {
    setVoiceLang(vl, false);
    updateUser({ voiceLanguage: vl });
    setNotificationMsg(
      vl === "twi"
        ? "Voice assistant switched to Asante Twi (🇬🇭)"
        : "Voice assistant switched to English (🇬🇧)"
    );
    setTimeout(() => setNotificationMsg(""), 3000);
  };

  const handleSwitchAppLang = (l) => {
    setLang(l);
    updateUser({ language: l });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    stopSpeech();
    await logout();
    navigate("/signin", { replace: true });
  };

  const week = computeWeek(user?.dueDate);
  const daysLeft = computeDaysRemaining(user?.dueDate);
  const babySize = getBabySize(week);
  const trimester = getTrimester(week);
  const progressPercent = week ? Math.min(100, Math.round((week / 40) * 100)) : 0;
  const dashOffset = week ? 251.2 - (week / 40) * 251.2 : 251.2;

  const isTwiSpeaking = isSpeaking && speakingLanguage === "twi";
  const isEngSpeaking = isSpeaking && speakingLanguage === "en";

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-6 pb-24">
      {/* Profile Header with Updatable Avatar */}
      <section className="flex flex-col items-center text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/*"
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer mb-3"
          title={lang === "twi" ? "Klik fa sesa wo mfonini" : "Tap to upload new profile picture"}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-primary-container text-on-primary-container flex items-center justify-center shadow-md group-hover:border-primary transition-all">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name || "User Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" strokeWidth={1.5} />
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-on-primary shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-background flex items-center justify-center"
            aria-label="Upload profile photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <h1 className="font-headline text-headline-lg text-primary font-bold tracking-tight">
          {user?.name || (lang === "twi" ? "Wo Akawnt" : "Your Account")}
        </h1>
        <p className="text-on-surface-variant text-sm font-medium">{user?.email}</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-semibold text-primary hover:underline mt-1 flex items-center gap-1"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{lang === "twi" ? "Sesa Wo Mfonini" : "Change Profile Photo"}</span>
        </button>
      </section>

      {/* Instant Feedback Toast */}
      {notificationMsg && (
        <div className="bg-forest-green/10 border border-forest-green/30 text-forest-green px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ═══ PREGNANCY DUE DATE & PROGRESS SECTION ═══ */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface">
              {lang === "twi" ? "Wo Awoɔ Da & Nyinsɛn Nkɔsoɔ" : "Pregnancy Due Date & Progress"}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {lang === "twi"
                ? "Fa wo da a wobɛwo kyerɛ ma yɛnhyehyɛ wo nyinsɛn kwan"
                : "Set your estimated due date to track your baby's development"}
            </p>
          </div>
        </div>

        {/* Live Progress Preview if Due Date Set */}
        {week ? (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
            {/* Mini Progress Circle */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container-highest" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="10" />
                <circle
                  className="text-primary transition-all duration-700 ease-out"
                  cx="50" cy="50" fill="transparent" r="40"
                  stroke="currentColor" strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-primary font-bold text-xs leading-none">
                <span>{progressPercent}%</span>
              </div>
            </div>

            {/* Info details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline font-bold text-sm text-on-surface">
                  {lang === "twi" ? `Nnawɔtwe ${week} / 40` : `Week ${week} of 40`}
                </span>
                {trimester && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {lang === "twi" ? trimester.twi : trimester.en}
                  </span>
                )}
              </div>

              {babySize && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {lang === "twi" ? `Wo ba su sɛ ${babySize.twi}` : `Baby is the size of ${babySize.en}`}
                </p>
              )}

              {daysLeft !== null && (
                <p className="text-[11px] text-outline mt-0.5">
                  {daysLeft === 0
                    ? (lang === "twi" ? "Awoɔ bere adu!" : "Due date is today!")
                    : (lang === "twi" ? `Nna ${daysLeft} aka wo awoɔ` : `${daysLeft} days until estimated delivery`)}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Due Date Form */}
        <form onSubmit={handleSaveDueDate} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              {lang === "twi" ? "Estimated Delivery Date (EDD):" : "Estimated Delivery Due Date:"}
            </label>
            <input
              type="date"
              required
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              style={{ colorScheme: "light" }}
              className="w-full max-w-full box-border bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary appearance-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingDate || !dueDateInput}
            className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all disabled:opacity-50"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>
              {savingDate
                ? (lang === "twi" ? "Rekora so..." : "Saving...")
                : (lang === "twi" ? "Kora Wo Awoɔ Da So (Save Due Date)" : "Save & Update Progress")}
            </span>
          </button>
        </form>
      </section>

      {/* ═══ DISPLAY MODE & VISUAL THEME ═══ */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface">
              {lang === "twi" ? "Ahosuo & App Nhyehyɛe (Display Theme)" : "Display Mode & Visual Theme"}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {lang === "twi"
                ? "Sesa app no ahosuo kɔ Rose anaa Futuristic Glassy Blue"
                : "Switch between Warm Rose & Futuristic Glassy Ocean Blue"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Theme Option 1: Warm Rose (Default) */}
          <div
            onClick={() => {
              setTheme("rose");
              setNotificationMsg(
                lang === "twi" ? "Sesa kɔɔ Warm Rose ahosuo mu!" : "Switched to Warm Rose theme 🌹"
              );
              setTimeout(() => setNotificationMsg(""), 3000);
            }}
            className={`rounded-2xl border-2 p-3.5 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              theme === "rose"
                ? "bg-[#fff3f0] border-[#9e4432] shadow-md ring-2 ring-[#9e4432]/30 scale-[1.02]"
                : "bg-surface-container-low border-outline-variant hover:border-primary/40"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#fde5e0] border border-[#f9c7be] flex items-center justify-center shadow-xs">
              <span className="text-lg">🌹</span>
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-xs text-[#2b2522]">
                {lang === "twi" ? "Warm Rose" : "Warm Rose"}
              </p>
            </div>
            {theme === "rose" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9e4432] text-white mt-1 shadow-xs">
                Active
              </span>
            )}
          </div>

          {/* Theme Option 2: Futuristic Glassy Blue */}
          <div
            onClick={() => {
              setTheme("ocean-blue");
              setNotificationMsg(
                lang === "twi" ? "Sesa kɔɔ Futuristic Glassy Blue ahosuo mu! 💎" : "Switched to Futuristic Glassy Blue theme 💎"
              );
              setTimeout(() => setNotificationMsg(""), 3000);
            }}
            className={`rounded-2xl border-2 p-3.5 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              theme === "ocean-blue"
                ? "bg-[#e0f2fe] border-[#0284c7] shadow-md ring-2 ring-[#0284c7]/40 scale-[1.02]"
                : "bg-surface-container-low border-outline-variant hover:border-primary/40"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#2563eb] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-xs text-[#0f172a]">
                {lang === "twi" ? "Ocean Blue" : "Glassy Blue"}
              </p>
            </div>
            {theme === "ocean-blue" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0284c7] text-white mt-1 shadow-xs">
                Active
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ═══ VOICE ASSISTANT & LANGUAGE SETTINGS ═══ */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface">
              {lang === "twi" ? "Kasa Mmoafo Nhyehyɛe" : "Voice Assistant Language"}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {lang === "twi"
                ? "Sesa kasa a Mama Ba de kasa kyerɛ wo"
                : "Choose your primary language for Mama Ba"}
            </p>
          </div>
        </div>

        {/* ── CARD 1: TWI VOICE ASSISTANT ── */}
        <div
          onClick={() => handleSelectActiveVoice("twi")}
          className={`rounded-2xl border-2 p-4 flex items-center justify-between cursor-pointer transition-all ${
            voiceLang === "twi"
              ? "bg-primary-container/15 border-primary shadow-xs ring-1 ring-primary/40"
              : "bg-surface-container-low border-outline-variant hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🇬🇭</span>
            <div>
              <h3 className="font-headline font-bold text-sm text-on-surface">
                Asante Twi
              </h3>
            </div>
          </div>

          <button
            type="button"
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
              voiceLang === "twi"
                ? "bg-primary text-on-primary border-primary shadow-xs"
                : "bg-surface-container text-on-surface-variant border-outline-variant"
            }`}
          >
            {voiceLang === "twi" && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{voiceLang === "twi" ? "Selected" : "Select"}</span>
          </button>
        </div>

        {/* ── CARD 2: ENGLISH VOICE ASSISTANT ── */}
        <div
          onClick={() => handleSelectActiveVoice("en")}
          className={`rounded-2xl border-2 p-4 flex items-center justify-between cursor-pointer transition-all ${
            voiceLang === "en"
              ? "bg-primary-container/15 border-primary shadow-xs ring-1 ring-primary/40"
              : "bg-surface-container-low border-outline-variant hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🇬🇧</span>
            <div>
              <h3 className="font-headline font-bold text-sm text-on-surface">
                English
              </h3>
            </div>
          </div>

          <button
            type="button"
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
              voiceLang === "en"
                ? "bg-primary text-on-primary border-primary shadow-xs"
                : "bg-surface-container text-on-surface-variant border-outline-variant"
            }`}
          >
            {voiceLang === "en" && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{voiceLang === "en" ? "Selected" : "Select"}</span>
          </button>
        </div>

        {/* App UI Language Toggle */}
        <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-outline" />
            <span className="text-xs font-semibold text-on-surface">
              {lang === "twi" ? "App No Kasa (App Display):" : "App Display Language:"}
            </span>
          </div>

          <div className="flex gap-1 bg-surface-container p-1 rounded-full border border-outline-variant">
            <button
              type="button"
              onClick={() => handleSwitchAppLang("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                lang === "en"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleSwitchAppLang("twi")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                lang === "twi"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Twi
            </button>
          </div>
        </div>
      </section>

      {/* Support & Safety Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1 text-xs font-semibold">
          {lang === "twi" ? "Mmoa & Banbɔ" : "Support & Safety"}
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <Link
            to="emergency-contacts"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface text-sm font-medium">
                {lang === "twi" ? "Nhyiam a Wɔfrɛ Ntɛm" : "Emergency Contacts"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <Link
            to="health-disclaimer"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface text-sm font-medium">
                {lang === "twi" ? "Apomuden Nkaebɔ" : "Health Disclaimer"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Account Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1 text-xs font-semibold">
          {lang === "twi" ? "Akawnt Nhyehyɛe" : "Account Settings"}
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <Link
            to="privacy-data"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface text-sm font-medium">
                {lang === "twi" ? "Wo Ho Nsɛm & Banbɔ" : "Privacy & Data"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <Link
            to="change-password"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface text-sm font-medium">
                {lang === "twi" ? "Sesa Wo Password" : "Change Password"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-error-container/40 transition-colors w-full"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-error" strokeWidth={1.5} />
              <span className="text-error font-semibold text-sm">
                {lang === "twi" ? "Pue Wɔ Mu (Sign Out)" : "Sign Out"}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* ═══ SIGN OUT CONFIRMATION MODAL ═══ */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface">
                  {lang === "twi" ? "Pue Wɔ Mu (Sign Out)" : "Sign Out"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {lang === "twi" ? "Bisa Nkaebɔ" : "Confirmation Request"}
                </p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {lang === "twi"
                ? "Wo pɛ sɛ wopue firi Mama Ba mu ankasa?"
                : "Are you sure you want to sign out of Mama Ba?"}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                {lang === "twi" ? "Gyae (Cancel)" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-3 rounded-xl bg-error text-on-error text-xs font-semibold shadow-xs hover:bg-error/90 transition-colors"
              >
                {lang === "twi" ? "Aane, Pue (Sign Out)" : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}