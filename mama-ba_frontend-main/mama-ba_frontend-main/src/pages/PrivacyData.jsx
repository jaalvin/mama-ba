import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HardDrive, Trash2, Check } from "lucide-react";

export default function PrivacyData() {
  const navigate = useNavigate();
  const [offlineSync, setOfflineSync] = useState(true);
  const [cleared, setCleared] = useState(false);

  const handleClearCache = () => {
    localStorage.clear();
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>
        <h1 className="font-headline text-headline-sm text-on-surface">Privacy &amp; Data</h1>
      </header>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-4">
        <h2 className="text-label-md text-on-surface uppercase tracking-wider">Offline Storage Preferences</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-on-surface block">Cache Triage Decision Trees</span>
            <span className="text-xs text-on-surface-variant">Keep symptom checking functional without active internet</span>
          </div>
          <button
            type="button"
            onClick={() => setOfflineSync(!offlineSync)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 relative ${
              offlineSync ? "bg-primary" : "bg-outline-variant"
            }`}
          >
            <span
              className={`block w-5 h-5 bg-white rounded-full transition-transform shadow ${
                offlineSync ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-primary" />
          <h2 className="text-label-md text-on-surface uppercase tracking-wider">Local Storage &amp; Cache</h2>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Your personal vital logs and offline search histories are retained locally on your browser for privacy.
        </p>
        
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full border border-error/30 text-error hover:bg-error-container/30 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {cleared ? <Check className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
          <span>{cleared ? "Local Data Cleared!" : "Clear Local Storage"}</span>
        </button>
      </section>
    </div>
  );
}