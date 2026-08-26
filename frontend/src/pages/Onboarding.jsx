import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [languagePref, setLanguagePref] = useState("twi");
  const [status, setStatus] = useState("trimester_2");
  const [conditions, setConditions] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      name: user?.name || "Abena Osei",
      phone: "+233244123456",
      dueDate: "2026-11-20"
    }
  });

  const toggleCondition = (cond) => {
    setConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const playAudioPreview = (lang) => {
    setAudioPlaying(lang);
    const text = lang === 'twi' 
      ? "Akwaaba! Me din de Mama Ba, wo apɔmuden boafoɔ." 
      : "Welcome! My name is Mama Ba, your guided health companion.";
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => setAudioPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAudioPlaying(false), 2000);
    }
  };

  const onSubmit = async (data) => {
    const profile = {
      userId: user?.email || "demo-patient-001",
      fullName: data.name,
      phoneNumber: data.phone,
      languagePreference: languagePref,
      isPregnant: status.startsWith("trimester"),
      gestationalWeeks: status === "trimester_1" ? 8 : status === "trimester_2" ? 24 : status === "trimester_3" ? 34 : 0,
      dueDate: data.dueDate,
      conditions
    };

    await api.saveProfile(profile);
    setUser((prev) => ({ ...prev, ...profile, name: data.name }));
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D231E] px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#E07A5F]/15 flex items-center justify-center text-[#E07A5F] font-bold text-lg">
          🌺
        </div>
        <div>
          <h1 className="font-bold text-2xl text-[#2D231E]">Mama Ba</h1>
          <p className="text-xs text-[#7A6B63]">Ghana Health Service Guided Companion</p>
        </div>
      </div>

      <h2 className="font-bold text-xl text-[#2D231E] mb-1">Language Setup & Profile</h2>
      <p className="text-sm text-[#7A6B63] mb-6">Select your language and setup your localized maternal care plan.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6 flex-1">
        {/* 1. Language Selector with Audio Preview Chips */}
        <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm">
          <label className="block text-sm font-semibold text-[#2D231E] mb-2 flex items-center justify-between">
            <span>Preferred Language / Kasa:</span>
            <span className="text-xs text-[#81B29A] font-normal">Tap 🔊 to listen</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguagePref("twi")}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                languagePref === "twi"
                  ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-sm"
                  : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
              }`}
            >
              <div className="text-left">
                <p className="font-bold text-sm">Twi (Akan)</p>
                <p className={`text-xs ${languagePref === "twi" ? "text-white/80" : "text-[#7A6B63]"}`}>Akwaaba</p>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); playAudioPreview('twi'); }}
                className={`p-2 rounded-full ${audioPlaying === 'twi' ? 'animate-bounce bg-white/20' : ''}`}
                title="Listen to Twi preview"
              >
                🔊
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLanguagePref("english")}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                languagePref === "english"
                  ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-sm"
                  : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
              }`}
            >
              <div className="text-left">
                <p className="font-bold text-sm">English</p>
                <p className={`text-xs ${languagePref === "english" ? "text-white/80" : "text-[#7A6B63]"}`}>Ghanaian Simple</p>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); playAudioPreview('english'); }}
                className={`p-2 rounded-full ${audioPlaying === 'english' ? 'animate-bounce bg-white/20' : ''}`}
                title="Listen to English preview"
              >
                🔊
              </span>
            </button>
          </div>
        </div>

        {/* 2. Name & Phone Inputs */}
        <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#2D231E] mb-1">
              Full Name / Din
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Abena Osei"
              className={`w-full min-h-[48px] px-4 rounded-xl bg-[#FAF7F2] border ${
                errors.name ? "border-red-500" : "border-[#EBE3D7]"
              } text-[#2D231E] text-sm focus:outline-none focus:border-[#E07A5F]`}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-[#2D231E] mb-1">
              Emergency Contact Phone
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+233 24 412 3456"
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] text-[#2D231E] text-sm focus:outline-none focus:border-[#E07A5F]"
              {...register("phone")}
            />
          </div>
        </div>

        {/* 3. Quick Profile Cards (Trimesters / Caregiver) */}
        <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm">
          <label className="block text-sm font-semibold text-[#2D231E] mb-3">
            Pregnancy & Caregiver Status:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "trimester_1", label: "Trimester 1", sub: "Weeks 1 - 12" },
              { id: "trimester_2", label: "Trimester 2", sub: "Weeks 13 - 27" },
              { id: "trimester_3", label: "Trimester 3", sub: "Weeks 28 - 40" },
              { id: "nursing", label: "Nursing Mother", sub: "Infant Care" }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatus(st.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  status === st.id
                    ? "bg-[#3D405B] text-white border-[#3D405B]"
                    : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                }`}
              >
                <p className="font-bold text-xs">{st.label}</p>
                <p className={`text-[10px] ${status === st.id ? "text-white/70" : "text-[#7A6B63]"}`}>{st.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Pre-existing Conditions */}
        <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm">
          <label className="block text-sm font-semibold text-[#2D231E] mb-2">
            Known Health Conditions (Optional):
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "hypertension", label: "High BP / Pre-eclampsia Risk" },
              { id: "sickle_cell", label: "Sickle Cell Trait" },
              { id: "diabetes", label: "Gestational Diabetes" },
              { id: "anemia", label: "Anemia / Low Iron" }
            ].map(cond => (
              <button
                key={cond.id}
                type="button"
                onClick={() => toggleCondition(cond.id)}
                className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                  conditions.includes(cond.id)
                    ? "bg-[#81B29A] text-white border-[#81B29A]"
                    : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                }`}
              >
                {cond.label} {conditions.includes(cond.id) ? "✓" : "+"}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Data Sovereignty Notice Card */}
        <div className="bg-[#81B29A]/10 border border-[#81B29A]/30 p-4 rounded-2xl flex items-start gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <h4 className="text-xs font-bold text-[#2B543D] uppercase tracking-wider">Data Sovereignty & Privacy Guard</h4>
            <p className="text-xs text-[#2B543D]/90 mt-1 leading-relaxed">
              All your vitals, health journal entries, and symptoms remain securely encrypted on your local device SQLite engine. Cloud sync occurs only with your authorization.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full min-h-[52px] rounded-2xl bg-[#E07A5F] text-white font-bold text-base shadow-md active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <span>Complete Setup & Start</span>
          <span>→</span>
        </button>
      </form>
    </div>
  );
}