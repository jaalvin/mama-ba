import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || user?.fullName || "Abena";
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ isConnected: true, pendingUploadCount: 0 });
  const [medications, setMedications] = useState([
    { id: 'rem-01', name: 'Iron & Folic Acid Tablet', time: '2:00 PM', dosage: '1 tablet daily', taken: false },
    { id: 'rem-02', name: 'Calcium Supplement', time: '8:00 AM', dosage: '1 tablet daily', taken: true },
    { id: 'rem-03', name: 'Prenatal Multivitamin', time: '9:00 AM', dosage: '1 tablet after breakfast', taken: true }
  ]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    api.getSyncStatus().then(res => {
      if (res && res.success) {
        setSyncStatus(res);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleMedication = (id) => {
    setMedications(prev => 
      prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m)
    );
  };

  return (
    <div className="px-4 py-6 flex flex-col gap-6 max-w-md mx-auto text-[#2D231E]">
      {/* 1. Live Offline Sync Pill Indicator */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#EBE3D7] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌺</span>
          <div>
            <p className="font-bold text-sm text-[#2D231E]">Mama Ba Companion</p>
            <p className="text-[11px] text-[#7A6B63]">Ghana Health Service</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          isOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {isOnline ? "🟢 Synced with Cloud" : "⚪ Saved On-Device – Offline"}
        </div>
      </div>

      {/* Hero Pregnancy Status Header */}
      <section className="flex flex-col items-center text-center bg-white p-5 rounded-2xl border border-[#EBE3D7] shadow-sm">
        <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-[#FAF7F2]" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
            <circle
              className="text-[#E07A5F]"
              cx="50" cy="50" fill="transparent" r="40"
              stroke="currentColor" strokeWidth="8"
              strokeDasharray="251.2" strokeDashoffset="90" strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#E07A5F]">
            <span className="text-2xl font-extrabold leading-none">24</span>
            <span className="text-[10px] uppercase tracking-widest mt-0.5">Weeks</span>
          </div>
        </div>
        <h1 className="font-bold text-lg text-[#2D231E]">Akwaaba, {name}!</h1>
        <p className="text-xs text-[#7A6B63] mt-0.5">Trimester 2 • Baby size: Ear of Corn 🌽</p>
      </section>

      {/* 2. Hero Voice Interaction Button */}
      <section className="bg-gradient-to-r from-[#E07A5F] to-[#D96B4E] rounded-2xl p-5 text-white shadow-md flex flex-col items-center text-center">
        <p className="text-xs font-medium text-white/90 mb-1">Dual-Language Voice AI Companion</p>
        <h3 className="font-bold text-base mb-3">Bisa me biribiara / Ask me anything</h3>
        
        <button
          onClick={() => navigate("/app/ask")}
          className="relative group w-20 h-20 rounded-full bg-white text-[#E07A5F] flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          <span className="text-3xl">🎙️</span>
        </button>
        
        <p className="text-[11px] text-white/80 mt-3">Tap microphone for Twi or English speech support</p>
      </section>

      {/* 3. Quick Action Category Cards */}
      <section className="grid grid-cols-2 gap-3">
        <Link to="/app/tracker" className="bg-white border border-[#EBE3D7] rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E07A5F] transition-all shadow-sm">
          <span className="text-3xl mb-1.5">🤰</span>
          <span className="font-bold text-xs text-[#2D231E]">Maternal & Baby Tracker</span>
          <span className="text-[10px] text-[#7A6B63] mt-0.5">8 ANC Visits & Vaccines</span>
        </Link>

        <Link to="/app/safety" className="bg-white border border-[#EBE3D7] rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E07A5F] transition-all shadow-sm">
          <span className="text-3xl mb-1.5">🌿</span>
          <span className="font-bold text-xs text-[#2D231E]">Herbal & Food Safety</span>
          <span className="text-[10px] text-[#7A6B63] mt-0.5">Apomuden Matrix</span>
        </Link>

        <Link to="/app/triage" className="bg-white border border-[#EBE3D7] rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E07A5F] transition-all shadow-sm">
          <span className="text-3xl mb-1.5">🚨</span>
          <span className="font-bold text-xs text-[#2D231E]">Check Symptoms</span>
          <span className="text-[10px] text-[#7A6B63] mt-0.5">Offline Red-Flag Modal</span>
        </Link>

        <Link to="/app/vitals" className="bg-white border border-[#EBE3D7] rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E07A5F] transition-all shadow-sm">
          <span className="text-3xl mb-1.5">🩺</span>
          <span className="font-bold text-xs text-[#2D231E]">Log Daily Vitals</span>
          <span className="text-[10px] text-[#7A6B63] mt-0.5">BP & Sparkline Graphs</span>
        </Link>

        <Link to="/app/logistics" className="col-span-2 bg-[#3D405B] text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div className="text-left">
              <span className="font-bold text-sm block">Find Nearby Pharmacy & Book Visit</span>
              <span className="text-xs text-white/80 block">Accredited GHS Community Pharmacies</span>
            </div>
          </div>
          <span className="text-xl">→</span>
        </Link>
      </section>

      {/* 4. Today's Medication Checklist */}
      <section className="bg-white rounded-2xl border border-[#EBE3D7] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-[#2D231E]">Today's Medication Checklist</h3>
            <p className="text-[11px] text-[#7A6B63]">Stay compliant with prenatal vitamins</p>
          </div>
          <span className="text-xs bg-[#81B29A]/20 text-[#2B543D] px-2.5 py-1 rounded-full font-bold">
            {medications.filter(m => m.taken).length} / {medications.length} Done
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {medications.map(med => (
            <div
              key={med.id}
              onClick={() => toggleMedication(med.id)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                med.taken ? "bg-emerald-50 border-emerald-200" : "bg-[#FAF7F2] border-[#EBE3D7]"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={med.taken}
                  onChange={() => {}}
                  className="w-5 h-5 rounded text-[#E07A5F] focus:ring-0 cursor-pointer"
                />
                <div>
                  <p className={`font-semibold text-xs ${med.taken ? "line-through text-gray-500" : "text-[#2D231E]"}`}>
                    {med.name}
                  </p>
                  <p className="text-[10px] text-[#7A6B63]">{med.dosage} • Scheduled: {med.time}</p>
                </div>
              </div>
              <span className={`text-xs font-bold ${med.taken ? "text-emerald-700" : "text-amber-700"}`}>
                {med.taken ? "Taken ✓" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}