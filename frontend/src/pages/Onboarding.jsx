import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang, playVoiceSample, stopSpeech } from "../context/LanguageContext.jsx";
import { Volume2, Square, Mic, CheckCircle2, Shield } from "lucide-react";

const TRIMESTERS = [
  { id: "t1", label: "Trimester 1", twi: "Bɔbea 1", icon: "pregnant_woman" },
  { id: "t2", label: "Trimester 2", twi: "Bɔbea 2", icon: "pregnant_woman" },
  { id: "t3", label: "Trimester 3", twi: "Bɔbea 3", icon: "pregnant_woman" },
  { id: "nursing", label: "Nursing Mother", twi: "Nufusu Maame", icon: "child_care" },
  { id: "caregiver", label: "Caregiver", twi: "Hwɛ-die", icon: "favorite" },
];

const CONDITIONS = [
  { id: "hbp",    label: "High Blood Pressure", twi: "Mogya tumi" },
  { id: "sickle", label: "Sickle Cell",          twi: "Dɔm yadeɛ" },
  { id: "gd",     label: "Gestational Diabetes", twi: "Sukaa yadeɛ" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { lang, setLang, voiceLang, setVoiceLang } = useLang();

  const [selectedVoice, setSelectedVoice] = useState(voiceLang || "twi");
  const [playingVoice, setPlayingVoice]   = useState(null); // "twi" | "en" | null
  const [status, setStatus]               = useState("t1");
  const [conditions, setConditions]       = useState([]);

  // Stop speech if navigating away
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const handleSelectVoice = (vl) => {
    stopSpeech();
    setPlayingVoice(null);
    setSelectedVoice(vl);
    setVoiceLang(vl);
  };

  const handleTogglePlaySample = (vl, e) => {
    if (e) e.stopPropagation();
    if (playingVoice === vl) {
      stopSpeech();
      setPlayingVoice(null);
    } else {
      stopSpeech();
      setSelectedVoice(vl);
      setVoiceLang(vl);
      playVoiceSample(
        vl,
        () => setPlayingVoice(vl),
        () => setPlayingVoice(null)
      );
    }
  };

  const toggleCondition = (id) =>
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const onSubmit = (e) => {
    e.preventDefault();
    stopSpeech();
    setVoiceLang(selectedVoice);
    const profile = {
      status,
      conditions,
      language: lang,
      voiceLanguage: selectedVoice,
    };
    setUser((prev) => ({ ...prev, ...profile }));
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 md:px-8">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <p className="font-headline text-headline-md font-bold text-primary text-center mb-6">
          Mama Ba
        </p>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-headline text-headline-md text-on-background">
                {lang === "twi" ? "Akwaaba! Yɛ Wo Nhyehyɛe" : `Welcome, ${user?.name || ""}!`}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {lang === "twi"
                  ? "Pawia wo kasa mmoafo ne apomuden nhyiam."
                  : "Let's personalize your care companion and voice assistant."}
              </p>
            </div>

            {/* Quick App UI Language Switcher */}
            <div className="flex gap-1.5 shrink-0 bg-surface-container p-1 rounded-full border border-outline-variant">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  lang === "en"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("twi")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  lang === "twi"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Twi
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-6">

            {/* ═══ VOICE ASSISTANT LANGUAGE SELECTION ═══ */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                <h2 className="text-label-md font-headline font-bold text-on-surface text-sm">
                  {lang === "twi" ? "1. Yi Wo Kasa Mmoa Kasa (Voice Assistant)" : "1. Choose Your Voice Assistant Language"}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {lang === "twi"
                  ? "Sɛ worekasa anaa woretie afotu a, kasa bɛn na wopɛ sɛ Mama Ba de kasa kyerɛ wo? (Wubetumi asesa no bere biara wɔ Settings)."
                  : "Which language would you prefer Mama Ba to speak and listen in? You can always change this in Settings later."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {/* Twi Card */}
                <div
                  onClick={() => handleSelectVoice("twi")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    selectedVoice === "twi"
                      ? "bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary"
                      : "bg-surface-container-lowest border-outline-variant hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🇬🇭</span>
                        <h3 className="font-headline font-bold text-on-surface text-sm">Twi</h3>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Kasa wɔ Twi mu na tie nkyerɛkyerɛmu
                      </p>
                    </div>
                    {selectedVoice === "twi" ? (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-outline-variant block shrink-0" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleTogglePlaySample("twi", e)}
                    className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl transition-all w-full ${
                      playingVoice === "twi"
                        ? "bg-error text-on-error animate-pulse shadow-sm"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {playingVoice === "twi" ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lang === "twi" ? "Tie Mfitiaseɛ (Preview)" : "Listen to Preview"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* English Card */}
                <div
                  onClick={() => handleSelectVoice("en")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    selectedVoice === "en"
                      ? "bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary"
                      : "bg-surface-container-lowest border-outline-variant hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🇬🇧</span>
                        <h3 className="font-headline font-bold text-on-surface text-sm">English</h3>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Speak in English &amp; receive spoken guidance
                      </p>
                    </div>
                    {selectedVoice === "en" ? (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-outline-variant block shrink-0" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleTogglePlaySample("en", e)}
                    className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl transition-all w-full ${
                      playingVoice === "en"
                        ? "bg-error text-on-error animate-pulse shadow-sm"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {playingVoice === "en" ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lang === "twi" ? "Tie Mfitiaseɛ (Preview)" : "Listen to Preview"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ═══ PREGNANCY / CARE STAGE ═══ */}
            <div>
              <label className="block text-label-md text-on-surface mb-2 font-semibold text-xs uppercase tracking-wider">
                {lang === "twi" ? "2. Dɛn na ɛkaa wo?" : "2. Which best describes your current stage?"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRIMESTERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatus(t.id)}
                    className={`min-h-[50px] rounded-2xl border flex items-center justify-center gap-2 px-3 text-xs font-semibold transition-colors ${
                      status === t.id
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    <span>{lang === "twi" ? t.twi : t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ KNOWN CONDITIONS ═══ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-label-md text-on-surface font-semibold text-xs uppercase tracking-wider">
                  {lang === "twi" ? "3. Apomuden tebea a wowɔ" : "3. Known health conditions"}
                </label>
                <span className="text-[11px] text-on-surface-variant">
                  {lang === "twi" ? "(Sɛ ɛwɔ hɔ a)" : "(Optional)"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCondition(c.id)}
                    className={`flex items-center gap-3 min-h-[46px] px-4 rounded-xl border text-left font-semibold text-xs transition-colors ${
                      conditions.includes(c.id)
                        ? "bg-primary/10 text-on-surface border-primary"
                        : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        conditions.includes(c.id)
                          ? "bg-primary border-primary"
                          : "border-outline-variant bg-white"
                      }`}
                    >
                      {conditions.includes(c.id) && (
                        <span className="material-symbols-outlined text-on-primary text-[12px]">check</span>
                      )}
                    </span>
                    <span>{lang === "twi" ? c.twi : c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy notice */}
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-3.5 flex gap-3 items-center">
              <Shield className="w-5 h-5 text-forest-green shrink-0" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {lang === "twi"
                  ? "Wo apomuden nsɛm ne kasa nhyehyɛe da wo fon so pɛpɛɛpɛ."
                  : "Your preferences and health logs are stored securely with complete user privacy."}
              </p>
            </div>

            <button
              type="submit"
              className="w-full min-h-[52px] rounded-2xl bg-primary text-on-primary font-headline text-button shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{lang === "twi" ? "Hyɛ Aseɛ Wɔ Mama Ba Mu" : "Continue to Dashboard"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}