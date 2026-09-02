import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";

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

let onboardingAudioPlayer = null;

async function speak(text, lang) {
  if (onboardingAudioPlayer) {
    onboardingAudioPlayer.pause();
    onboardingAudioPlayer = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const isTwi = lang === "twi" || lang === "tw";
  const voice = isTwi ? "abena_twi_high" : "akua_eng";

  try {
    const res = await api.synthesizeSpeech({
      text,
      language: isTwi ? "tw" : "en",
      voice
    });

    if (res && res.success && res.blob && res.blob.size > 200) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      const audioUrl = URL.createObjectURL(res.blob);
      const audio = new Audio(audioUrl);
      onboardingAudioPlayer = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (onboardingAudioPlayer === audio) onboardingAudioPlayer = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (onboardingAudioPlayer === audio) onboardingAudioPlayer = null;
      };
      await audio.play();
      return;
    }
  } catch (e) {}

  if (isTwi) {
    console.log('[Onboarding] Twi speech uses Abena AI Neural Engine exclusively.');
    return;
  }

  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "en-GH";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { lang, setLang } = useLang();
  const [status, setStatus]         = useState("t1");
  const [conditions, setConditions] = useState([]);

  const toggleCondition = (id) =>
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const onSubmit = (e) => {
    e.preventDefault();
    const profile = { status, conditions, language: lang };
    setUser((prev) => ({ ...prev, ...profile }));
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 md:px-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <p className="font-headline text-headline-md font-bold text-primary text-center mb-6">
          Mama Ba
        </p>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8 flex flex-col gap-6">

          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-headline-md text-on-background">
                {lang === "twi" ? "Yɛn ho nsɛm" : "One last step!"}
              </h1>
              <p className="text-sm text-on-surface-variant mt-0.5">
                {lang === "twi"
                  ? "Yɛ wo akwantu mma wo nkwa pa."
                  : `Welcome, ${user?.name || ""}. Personalize your care.`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setLang("en"); speak("English"); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  lang === "en"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container text-on-surface-variant border-outline-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">volume_up</span>EN
              </button>
              <button
                type="button"
                onClick={() => { setLang("twi"); speak("Twi"); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  lang === "twi"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container text-on-surface-variant border-outline-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">volume_up</span>Twi
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {/* Pregnancy / Care Status */}
            <div>
              <span className="block text-label-md text-on-surface mb-3">
                {lang === "twi" ? "Dɛn na ɛkaa wo?" : "Which best describes you?"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TRIMESTERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatus(t.id)}
                    className={`min-h-[52px] rounded-2xl border flex items-center justify-center gap-2 px-3 text-sm font-semibold transition-colors ${
                      status === t.id
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    {lang === "twi" ? t.twi : t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Known Conditions */}
            <div>
              <span className="block text-label-md text-on-surface mb-1">
                {lang === "twi" ? "Yadeɛ a wohwɛ ho" : "Known conditions"}{" "}
                <span className="font-normal text-on-surface-variant text-sm">(optional)</span>
              </span>
              <p className="text-sm text-on-surface-variant mb-3">
                {lang === "twi" ? "Yi nea ɛfa wo ho" : "Select all that apply"}
              </p>
              <div className="flex flex-col gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCondition(c.id)}
                    className={`flex items-center gap-3 min-h-[48px] px-4 rounded-2xl border text-left font-semibold text-sm transition-colors ${
                      conditions.includes(c.id)
                        ? "bg-secondary-container/30 text-on-surface border-secondary"
                        : "bg-surface-container text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        conditions.includes(c.id)
                          ? "bg-primary border-primary"
                          : "border-outline-variant bg-white"
                      }`}
                    >
                      {conditions.includes(c.id) && (
                        <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
                      )}
                    </span>
                    {lang === "twi" ? c.twi : c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data Sovereignty Notice */}
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-forest-green shrink-0 mt-0.5">shield</span>
              <div>
                <p className="text-sm font-semibold text-forest-green mb-1">
                  {lang === "twi" ? "Wo ho nsɛm teɛ wo nkyɛn" : "Your Data Stays With You"}
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {lang === "twi"
                    ? "Wo apomuden nsɛm kyerɛ w'akyerɛkyerɛ nkutoo. Yɛnkyerɛ obiara."
                    : "All your health logs are stored safely on this device only. We never share your personal information."}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[56px] rounded-full bg-primary text-on-primary font-headline text-button shadow-sm active:scale-95 transition-transform"
            >
              {lang === "twi" ? "Kɔ so" : "Get Started"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}