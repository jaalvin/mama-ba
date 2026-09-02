import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import {
  User,
  Calendar,
  Mic,
  Volume2,
  Square,
  Pause,
  Play,
  Globe,
  PhoneCall,
  ShieldAlert,
  Lock,
  KeyRound,
  LogOut,
  ChevronRight,
  CheckCircle2,
  CalendarCheck,
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

const TWI_SAMPLE =
  "“Akwaaba! Me ne Mama Ba, wo nnamfo pa wɔ nyinsɛn mu. Metumi aboa wo wɔ apomuden ne wo ba no ho.”";

const ENG_SAMPLE =
  "“Welcome to Mama Ba! I am your personal maternal health companion, here to support you through your pregnancy and early motherhood.”";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const {
    lang,
    setLang,
    voiceLang,
    setVoiceLang,
    isSpeaking,
    isPaused,
    speakingLanguage,
    stopSpeech,
    playVoiceSample,
  } = useLang();
  const navigate = useNavigate();

  const [dueDateInput, setDueDateInput]   = useState(user?.dueDate || "");
  const [savingDate, setSavingDate]       = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  // Update input if user object updates
  useEffect(() => {
    if (user?.dueDate) {
      setDueDateInput(user.dueDate);
    }
  }, [user?.dueDate]);

  // Stop speech if navigating away
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  const handleSaveDueDate = (e) => {
    e.preventDefault();
    if (!dueDateInput) return;
    setSavingDate(true);
    updateUser({ dueDate: dueDateInput });
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

  const handleLogout = async () => {
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
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-3 shadow-sm">
          <User className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-headline text-headline-lg text-primary">
          {user?.name || (lang === "twi" ? "Wo Akawnt" : "Your Account")}
        </h1>
        <p className="text-on-surface-variant text-sm">{user?.email}</p>
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
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
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
                ? "Sesa kasa a Mama Ba de kasa kyerɛ wo na tie mfitiaseɛ"
                : "Choose the language Mama Ba speaks & test voice audio samples"}
            </p>
          </div>
        </div>

        {/* ── CARD 1: TWI VOICE ASSISTANT ── */}
        <div
          className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
            voiceLang === "twi"
              ? "bg-primary-container/15 border-primary shadow-xs ring-1 ring-primary/40"
              : "bg-surface-container-low border-outline-variant"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇬🇭</span>
              <div>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Twi Voice Assistant (Asante Twi)
                </h3>
                <span className="text-[11px] text-on-surface-variant">
                  {voiceLang === "twi" ? "Active Voice Assistant" : "Tap radio to activate"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectActiveVoice("twi")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                voiceLang === "twi"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
              }`}
            >
              {voiceLang === "twi" && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{voiceLang === "twi" ? "Selected" : "Set as Active"}</span>
            </button>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-outline-variant/60">
            <span className="text-[11px] font-semibold text-primary block mb-1">
              🇬🇭 Twi Sample Statement:
            </span>
            <p className="text-xs italic text-on-surface-variant leading-relaxed">
              {TWI_SAMPLE}
            </p>
          </div>

          {/* Twi Audio Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => playVoiceSample("twi")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isTwiSpeaking && !isPaused
                  ? "bg-primary text-on-primary shadow-sm"
                  : isTwiSpeaking && isPaused
                  ? "bg-earthen-ochre text-white shadow-sm"
                  : "bg-primary text-on-primary hover:bg-primary/90 shadow-xs"
              }`}
            >
              {isTwiSpeaking && !isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Twi Speech</span>
                </>
              ) : isTwiSpeaking && isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Twi Speech</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play Full Twi Statement</span>
                </>
              )}
            </button>

            {isTwiSpeaking && (
              <button
                type="button"
                onClick={stopSpeech}
                className="py-2.5 px-4 rounded-xl bg-error text-on-error text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-error/90 cursor-pointer"
                title="Stop Speech"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* ── CARD 2: ENGLISH VOICE ASSISTANT ── */}
        <div
          className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${
            voiceLang === "en"
              ? "bg-primary-container/15 border-primary shadow-xs ring-1 ring-primary/40"
              : "bg-surface-container-low border-outline-variant"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇬🇧</span>
              <div>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  English Voice Assistant
                </h3>
                <span className="text-[11px] text-on-surface-variant">
                  {voiceLang === "en" ? "Active Voice Assistant" : "Tap radio to activate"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectActiveVoice("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                voiceLang === "en"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
              }`}
            >
              {voiceLang === "en" && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{voiceLang === "en" ? "Selected" : "Set as Active"}</span>
            </button>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-outline-variant/60">
            <span className="text-[11px] font-semibold text-primary block mb-1">
              🇬🇧 English Sample Statement:
            </span>
            <p className="text-xs italic text-on-surface-variant leading-relaxed">
              {ENG_SAMPLE}
            </p>
          </div>

          {/* English Audio Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => playVoiceSample("en")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isEngSpeaking && !isPaused
                  ? "bg-primary text-on-primary shadow-sm"
                  : isEngSpeaking && isPaused
                  ? "bg-earthen-ochre text-white shadow-sm"
                  : "bg-primary text-on-primary hover:bg-primary/90 shadow-xs"
              }`}
            >
              {isEngSpeaking && !isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause English Speech</span>
                </>
              ) : isEngSpeaking && isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume English Speech</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play Full English Statement</span>
                </>
              )}
            </button>

            {isEngSpeaking && (
              <button
                type="button"
                onClick={stopSpeech}
                className="py-2.5 px-4 rounded-xl bg-error text-on-error text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-error/90 cursor-pointer"
                title="Stop Speech"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
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
            onClick={handleLogout}
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
    </div>
  );
}