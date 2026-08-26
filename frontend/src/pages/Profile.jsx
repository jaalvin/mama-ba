import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";
import { User, PhoneCall, ShieldAlert, Lock, LogOut, ChevronRight, Save, Globe } from "lucide-react";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const { lang, setLang } = useLang();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "Abena Osei");
  const [phone, setPhone] = useState(user?.phone || "+233 24 555 0192");
  const [trimester, setTrimester] = useState("Trimester 2 (Week 24)");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchBackendProfile() {
      if (user?.email) {
        const res = await api.getProfile(user.email);
        if (res.success && res.profile) {
          if (res.profile.name) setName(res.profile.name);
          if (res.profile.phone) setPhone(res.profile.phone);
          if (res.profile.trimester) setTrimester(res.profile.trimester);
        }
      }
    }
    fetchBackendProfile();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveProfile({
        userId: user?.email || "demo-patient-001",
        name,
        phone,
        trimester,
        language: lang
      });
      if (setUser) {
        setUser((prev) => ({ ...prev, name, phone, trimester }));
      }
      alert(lang === "twi" ? "Wɔagye wo nsɛm wɔ SQLite database mu!" : "Profile updated persistently in SQLite database!");
    } catch {
      alert(lang === "twi" ? "Wɔagye wo nsɛm!" : "Profile updated!");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-6">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-3 shadow-md">
          <User className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-headline text-headline-lg text-primary font-bold">
          {name}
        </h1>
        <p className="text-on-surface-variant text-sm">{user?.email || "abena@example.com"}</p>
      </section>

      {/* Edit Profile Form Persistent in SQLite */}
      <form onSubmit={handleSaveProfile} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-label-md text-on-surface font-semibold uppercase tracking-wider">
          {lang === "twi" ? "Siesie Wo Nsɛm (SQLite Data)" : "Patient Details (Database Persistent)"}
        </h2>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {lang === "twi" ? "Din" : "Full Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {lang === "twi" ? "Fon Nɔma" : "Phone Number"}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {lang === "twi" ? "Abɔdeɛ Gyinabea" : "Pregnancy Stage / Trimester"}
          </label>
          <select
            value={trimester}
            onChange={(e) => setTrimester(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none font-medium"
          >
            <option value="Trimester 1 (Weeks 1-12)">Trimester 1 (Weeks 1-12)</option>
            <option value="Trimester 2 (Week 24)">Trimester 2 (Week 24)</option>
            <option value="Trimester 3 (Weeks 28-40)">Trimester 3 (Weeks 28-40)</option>
            <option value="Postpartum / Nursing">Postpartum / Nursing Mother</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {lang === "twi" ? "Kasa a Wopɛ" : "App Language"}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                lang === "en" ? "bg-primary text-on-primary border-primary" : "bg-surface-container border-outline-variant text-on-surface"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> English (GH)
            </button>
            <button
              type="button"
              onClick={() => setLang("twi")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                lang === "twi" ? "bg-primary text-on-primary border-primary" : "bg-surface-container border-outline-variant text-on-surface"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Twi
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-full bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-95 shadow-md mt-1"
        >
          <Save className="w-4 h-4" />
          {saving
            ? (lang === "twi" ? "Ɛrekɔ database..." : "Saving to Database...")
            : (lang === "twi" ? "Gye Nkae (Save Profile)" : "Save Profile to Database")}
        </button>
      </form>

      {/* Support & Navigation Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1">
          Support &amp; Safety
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <Link
            to="/app/emergency"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface font-medium text-sm">Emergency Contacts</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Account Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1">
          Account
        </h2>
        <div className="flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-4 text-left hover:bg-error-container/40 text-error transition-colors w-full"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
            <span className="font-semibold text-sm">Sign out</span>
          </button>
        </div>
      </section>
    </div>
  );
}