import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const navItems = [
  { to: "/app", label: "Home", icon: "🏠", end: true },
  { to: "/app/ask", label: "Ask AI", icon: "🎙️" },
  { to: "/app/safety", label: "Safety", icon: "🚨" },
  { to: "/app/tracker", label: "Tracker", icon: "📊" },
  { to: "/app/logistics", label: "Care Access", icon: "🏥" },
];

export default function AppShell() {
  const { user, setUser } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [languagePref, setLanguagePref] = useState(user?.languagePreference || "twi");
  const [trimester, setTrimester] = useState("trimester_2");
  const [saveNotice, setSaveNotice] = useState(false);

  const handleSaveSettings = async () => {
    const updated = {
      userId: user?.email || "demo-patient-001",
      fullName: user?.name || "Abena Osei",
      languagePreference: languagePref,
      gestationalWeeks: trimester === "trimester_1" ? 8 : trimester === "trimester_2" ? 24 : 34
    };
    await api.saveProfile(updated);
    setUser(prev => ({ ...prev, ...updated }));
    setSaveNotice(true);
    setTimeout(() => {
      setSaveNotice(false);
      setShowProfileModal(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D231E]">
      <div className="relative mx-auto w-full md:max-w-md min-h-screen md:shadow-xl md:border-x md:border-[#EBE3D7]">
        {/* Top Fixed Header */}
        <header className="fixed top-0 inset-x-0 mx-auto w-full md:max-w-md z-40 flex items-center justify-between h-14 px-4 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#EBE3D7]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌺</span>
            <span className="font-bold text-base text-[#2D231E]">Mama Ba</span>
            <span className="text-[10px] bg-[#E07A5F]/15 text-[#E07A5F] px-2 py-0.5 rounded-full font-bold">
              GHS Companion
            </span>
          </div>

          {/* Profile & Language Settings Modal Trigger */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-9 h-9 rounded-full bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/30 flex items-center justify-center font-bold text-sm hover:bg-[#E07A5F] hover:text-white transition-all shadow-xs"
            title="Profile & Language Settings"
          >
            👤
          </button>
        </header>

        {/* Main Content Area */}
        <main className="pt-16 pb-24 min-h-screen">
          <Outlet />
        </main>

        {/* 5-Tab Bottom Navigation Bar */}
        <nav className="fixed bottom-0 inset-x-0 mx-auto w-full md:max-w-md z-40 grid grid-cols-5 items-center px-2 py-2 bg-white border-t border-[#EBE3D7] rounded-t-2xl shadow-lg">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#E07A5F] text-white shadow-xs font-bold scale-105"
                    : "text-[#7A6B63] hover:text-[#2D231E]"
                }`
              }
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 leading-none font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profile & Language Settings Modal (Screen 1 Modal) */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#EBE3D7] shadow-2xl flex flex-col gap-4 text-[#2D231E]">
              <div className="flex items-center justify-between border-b border-[#EBE3D7] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  <h3 className="font-bold text-base text-[#2D231E]">Profile &amp; Language Settings</h3>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 font-bold text-lg">✕</button>
              </div>

              {/* Language Switcher */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-2">
                  Preferred Language / Kasa:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguagePref("twi")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      languagePref === "twi"
                        ? "bg-[#E07A5F] text-white border-[#E07A5F]"
                        : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                    }`}
                  >
                    Twi (Akan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguagePref("english")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      languagePref === "english"
                        ? "bg-[#E07A5F] text-white border-[#E07A5F]"
                        : "bg-[#FAF7F2] text-[#2D231E] border-[#EBE3D7]"
                    }`}
                  >
                    Simple English
                  </button>
                </div>
              </div>

              {/* Trimester Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B63] mb-2">
                  Pregnancy Stage:
                </label>
                <select
                  value={trimester}
                  onChange={(e) => setTrimester(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-semibold text-xs text-[#2D231E]"
                >
                  <option value="trimester_1">Trimester 1 (Weeks 1 - 12)</option>
                  <option value="trimester_2">Trimester 2 (Weeks 13 - 27)</option>
                  <option value="trimester_3">Trimester 3 (Weeks 28 - 40)</option>
                  <option value="nursing">Nursing Mother / Caregiver</option>
                </select>
              </div>

              {/* Data Sovereignty Notice Card */}
              <div className="bg-[#81B29A]/15 border border-[#81B29A]/30 p-3 rounded-2xl flex items-start gap-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <h4 className="text-[11px] font-bold text-[#2B543D] uppercase">Data Sovereignty Guard</h4>
                  <p className="text-[10px] text-[#2B543D]/90 mt-0.5 leading-tight">
                    All vitals and diary entries remain encrypted on your local SQLite database.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-2xl bg-[#E07A5F] text-white font-bold text-sm shadow-md active:scale-95 transition-transform"
              >
                {saveNotice ? "Settings Saved ✓" : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}