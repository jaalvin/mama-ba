import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { Baby, Leaf, AlertTriangle, HeartPulse, MapPin, ChevronRight } from "lucide-react";

const MEDS = [
  { id: "iron", label: "Iron & Folic Acid", time: "2:00 PM", twi: "Ayaresa nhoma" },
  { id: "calcium", label: "Calcium Supplement", time: "8:00 AM", twi: "Kalsiɔm" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  const name = user?.name || (lang === "twi" ? "Ɛho" : "there");
  const [isOnline] = useState(navigator.onLine);
  const [checked, setChecked] = useState([]);

  const toggleMed = (id) =>
    setChecked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const [recording, setRecording] = useState(false);

  return (
    <div className="px-4 py-6 md:px-6 flex flex-col gap-6 max-w-lg mx-auto">

      {/* Hero greeting */}
      <section className="flex flex-col items-center text-center gap-2">
        <div className="relative w-32 h-32 mb-1 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-surface-container-highest" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
            <circle
              className="text-primary"
              cx="50" cy="50" fill="transparent" r="40"
              stroke="currentColor" strokeWidth="8"
              strokeDasharray="251.2" strokeDashoffset="100.48" strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
            <span className="text-3xl font-bold leading-none">24</span>
            <span className="text-xs uppercase tracking-widest mt-1">{lang === "twi" ? "Nnawɔtwe" : "Weeks"}</span>
          </div>
        </div>
        <h1 className="font-headline text-headline-md text-on-surface">
          {lang === "twi" ? `Akwaaba, ${name}` : `Hello, ${name}`}
        </h1>
        <p className="text-on-surface-variant text-sm">
          {lang === "twi" ? "Wo ba su sɛ aburoɔ!" : "Your baby is the size of an ear of corn!"}
        </p>
      </section>

      {/* Hero Voice Button */}
      <section className="flex flex-col items-center gap-3">
        <button
          onClick={() => setRecording((r) => !r)}
          aria-label={lang === "twi" ? "Bisa me biribiara" : "Ask me anything"}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            recording ? "bg-error" : "bg-primary"
          }`}
        >
          <span className="material-symbols-outlined text-on-primary text-[42px]">mic</span>
        </button>

        {/* Waveform animation */}
        {recording && (
          <div className="flex items-center gap-1 h-8">
            {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-primary"
                style={{
                  height: `${h * 6}px`,
                  animation: `pulse 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        <p className="text-on-surface-variant text-sm font-semibold">
          {lang === "twi" ? "Bisa me biribiara" : "Ask me anything"}
        </p>
      </section>

      {/* Quick Action Cards */}
      <section>
        <h2 className="font-headline text-headline-md text-on-surface mb-3">
          {lang === "twi" ? "Yɛ biribi ntɛm" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/maternal" className="bg-primary-container/30 border border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-primary-container/50 transition-colors">
            <Baby className="w-7 h-7 text-primary" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">
              {lang === "twi" ? "Maame & Ba" : "Maternal & Baby Tracker"}
            </span>
          </Link>
          
          <Link to="/app/safety" className="bg-forest-green/10 border border-forest-green/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-forest-green/20 transition-colors">
            <Leaf className="w-7 h-7 text-forest-green" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">
              {lang === "twi" ? "Afifide & Nnuro" : "Herbal & Medication Safety"}
            </span>
          </Link>
          
          <Link to="/app/triage" className="bg-error-container/40 border border-error/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-error-container/60 transition-colors">
            <AlertTriangle className="w-7 h-7 text-error" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">
              {lang === "twi" ? "Hwɛ Yadeɛ" : "Check Symptoms"}
            </span>
          </Link>
          
          <Link to="/app/vitals" className="bg-tertiary-container/20 border border-tertiary/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-tertiary-container/40 transition-colors">
            <HeartPulse className="w-7 h-7 text-tertiary" strokeWidth={1.5} />
            <span className="text-label-md text-on-surface text-sm leading-tight">
              {lang === "twi" ? "Gye Apomuden Nkae" : "Log Daily Vitals"}
            </span>
          </Link>
          
          <Link to="/app/care" className="col-span-2 bg-secondary-container/20 border border-secondary/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-secondary-container/40 transition-colors">
            <MapPin className="w-7 h-7 text-secondary shrink-0" strokeWidth={1.5} />
            <div className="text-left">
              <span className="text-label-md text-on-surface block">
                {lang === "twi" ? "Hwɛ Adwumakuw a Ɛbɛn Wo" : "Find Nearby Pharmacy"}
              </span>
              <span className="text-sm text-on-surface-variant">
                {lang === "twi" ? "Ayaresabea ne Adwumakuw" : "Book appointments & order meds"}
              </span>
            </div>
            <ChevronRight className="ml-auto text-outline w-6 h-6" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Today's Medication Checklist */}
      <section>
        <h2 className="font-headline text-headline-md text-on-surface mb-3">
          {lang === "twi" ? "Nnuro Ɛnnɛ" : "Today's Medications"}
        </h2>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant overflow-hidden">
          {MEDS.map((med) => (
            <button
              key={med.id}
              onClick={() => toggleMed(med.id)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
            >
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked.includes(med.id)
                    ? "bg-forest-green border-forest-green"
                    : "border-outline-variant"
                }`}
              >
                {checked.includes(med.id) && (
                  <span className="material-symbols-outlined text-white text-[16px]">check</span>
                )}
              </span>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${checked.includes(med.id) ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                  {lang === "twi" ? med.twi : med.label}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  <span className="material-symbols-outlined text-[12px] align-middle mr-1">schedule</span>
                  {lang === "twi" ? `Gye ${med.time}` : `Take at ${med.time}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}