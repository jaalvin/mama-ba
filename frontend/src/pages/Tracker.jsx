import React, { useState } from "react";
import { api } from "../services/api.js";

export default function Tracker() {
  const [mainSegment, setMainSegment] = useState("maternal"); // 'maternal' or 'vitals'

  // Segment A: Maternal & Baby State
  const [subTab, setSubTab] = useState("anc"); // 'anc' or 'vaccines'
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const [ancVisits, setAncVisits] = useState([
    { id: 1, week: 8, titleEn: "ANC Visit 1 (Registration)", focus: "First trimester screening, BP baseline, iron prescription.", completed: true },
    { id: 2, week: 20, titleEn: "ANC Visit 2 (Anomaly Scan)", focus: "Fetal growth check, second dose Tetanus (TT2).", completed: true },
    { id: 3, week: 26, titleEn: "ANC Visit 3 (Anemia Check)", focus: "Glucose tolerance test, hemoglobin (Hb) blood count.", completed: false, isNext: true },
    { id: 4, week: 30, titleEn: "ANC Visit 4 (Wellbeing)", focus: "Pre-eclampsia screening, blood pressure monitoring.", completed: false },
    { id: 5, week: 34, titleEn: "ANC Visit 5 (Birth Plan)", focus: "Delivery preparedness, emergency referral path.", completed: false },
    { id: 6, week: 36, titleEn: "ANC Visit 6 (Presentation)", focus: "Baby position check, fetal movement monitoring.", completed: false },
    { id: 7, week: 38, titleEn: "ANC Visit 7 (Term Assessment)", focus: "Cervical readiness and labor sign review.", completed: false },
    { id: 8, week: 40, titleEn: "ANC Visit 8 (Delivery Readiness)", focus: "Final delivery checkup at GHS health center.", completed: false }
  ]);

  const [vaccines, setVaccines] = useState([
    { id: "v1", timing: "Birth", vaccine: "BCG & OPV-0 (Polio)", focus: "Tuberculosis and Oral Polio protection.", completed: true },
    { id: "v2", timing: "6 Weeks", vaccine: "Penta-1, PCV-1, Rota-1, OPV-1", focus: "DTP, Hepatitis B, Hib, Pneumococcal, Rotavirus.", completed: false, isNext: true },
    { id: "v3", timing: "10 Weeks", vaccine: "Penta-2, PCV-2, Rota-2, OPV-2", focus: "Second routine booster immunization doses.", completed: false },
    { id: "v4", timing: "14 Weeks", vaccine: "Penta-3, PCV-3, IPV, OPV-3", focus: "Third primary series & Inactivated Polio.", completed: false },
    { id: "v5", timing: "9 Months", vaccine: "Measles-Rubella 1 & Yellow Fever", focus: "Measles and Yellow Fever immunization.", completed: false }
  ]);

  const toggleAnc = (id) => setAncVisits(prev => prev.map(v => v.id === id ? { ...v, completed: !v.completed } : v));
  const toggleVac = (id) => setVaccines(prev => prev.map(v => v.id === id ? { ...v, completed: !v.completed } : v));

  // Segment B: Vitals & Journal State
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [temp, setTemp] = useState(36.8);
  const [weight, setWeight] = useState(68.5);
  const [notes, setNotes] = useState("");
  const [savingVitals, setSavingVitals] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const [vitalsHistory] = useState([
    { date: "Oct 10", sys: 118 },
    { date: "Oct 15", sys: 122 },
    { date: "Oct 20", sys: 125 },
    { date: "Today", sys: systolic }
  ]);

  const getBPBadge = (sys, dia) => {
    if (sys >= 160 || dia >= 110) return { label: "CRITICAL PRE-ECLAMPSIA", bg: "bg-red-500 text-white" };
    if (sys >= 140 || dia >= 90) return { label: "HYPERTENSION ALERT", bg: "bg-amber-500 text-white" };
    return { label: "NORMAL BP", bg: "bg-emerald-500 text-white" };
  };

  const bpBadge = getBPBadge(systolic, diastolic);

  const handleSaveVitals = async () => {
    setSavingVitals(true);
    await api.logVitals({
      userId: "demo-patient-001",
      systolicBp: systolic,
      diastolicBp: diastolic,
      bodyTemperature: temp,
      weightKg: weight,
      notes
    });
    setSavingVitals(false);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2000);
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-5 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Health Tracker &amp; Diary</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          Maternal ANC Timelines, Vaccine Milestones &amp; Daily Vitals Sparklines.
        </p>
      </div>

      {/* Top Segmented Switcher */}
      <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#EBE3D7] shadow-xs">
        <button
          onClick={() => setMainSegment("maternal")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainSegment === "maternal"
              ? "bg-[#E07A5F] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          🤰 Maternal &amp; Baby
        </button>
        <button
          onClick={() => setMainSegment("vitals")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainSegment === "vitals"
              ? "bg-[#3D405B] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          🩺 Vitals &amp; Journal
        </button>
      </div>

      {/* SEGMENT A: Maternal Care & Baby Milestones */}
      {mainSegment === "maternal" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#EBE3D7]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <p className="font-bold text-xs">Local Visit Reminders</p>
                <p className="text-[10px] text-[#7A6B63]">Offline device notifications</p>
              </div>
            </div>
            <button
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              className={`w-11 h-6 rounded-full p-1 transition-colors ${remindersEnabled ? "bg-[#E07A5F]" : "bg-gray-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${remindersEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSubTab("anc")}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                subTab === "anc" ? "bg-[#3D405B] text-white border-[#3D405B]" : "bg-white text-[#2D231E] border-[#EBE3D7]"
              }`}
            >
              8 GHS ANC Visits
            </button>
            <button
              onClick={() => setSubTab("vaccines")}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                subTab === "vaccines" ? "bg-[#3D405B] text-white border-[#3D405B]" : "bg-white text-[#2D231E] border-[#EBE3D7]"
              }`}
            >
              Infant Vaccines
            </button>
          </div>

          {subTab === "anc" ? (
            <div className="flex flex-col gap-2.5">
              {ancVisits.map(v => (
                <div
                  key={v.id}
                  onClick={() => toggleAnc(v.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    v.completed ? "bg-emerald-50 border-emerald-200" : v.isNext ? "bg-[#E07A5F] text-white" : "bg-white border-[#EBE3D7]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={v.completed} onChange={() => {}} className="w-4 h-4 text-[#E07A5F]" />
                      <h4 className="font-bold text-xs">{v.titleEn}</h4>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/30">Week {v.week}</span>
                  </div>
                  <p className="text-[11px] ml-6 opacity-90">{v.focus}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {vaccines.map(vac => (
                <div
                  key={vac.id}
                  onClick={() => toggleVac(vac.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    vac.completed ? "bg-emerald-50 border-emerald-200" : vac.isNext ? "bg-[#3D405B] text-white" : "bg-white border-[#EBE3D7]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={vac.completed} onChange={() => {}} className="w-4 h-4 text-[#3D405B]" />
                      <h4 className="font-bold text-xs">{vac.vaccine}</h4>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/30">{vac.timing}</span>
                  </div>
                  <p className="text-[11px] ml-6 opacity-90">{vac.focus}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT B: Vitals Logging & Daily Journal */}
      {mainSegment === "vitals" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7] shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs">Blood Pressure (mmHg)</label>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${bpBadge.bg}`}>{bpBadge.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#7A6B63]">Systolic</span>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(Number(e.target.value))}
                  className="w-full h-10 px-2 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-bold text-sm text-center"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#7A6B63]">Diastolic</span>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(Number(e.target.value))}
                  className="w-full h-10 px-2 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] font-bold text-sm text-center"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-[#EBE3D7]">
              <span className="text-[10px] font-bold text-[#7A6B63]">Temp (°C)</span>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-full h-9 px-2 rounded-xl bg-[#FAF7F2] border font-bold text-xs text-center mt-1"
              />
            </div>
            <div className="bg-white p-3 rounded-2xl border border-[#EBE3D7]">
              <span className="text-[10px] font-bold text-[#7A6B63]">Weight (kg)</span>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full h-9 px-2 rounded-xl bg-[#FAF7F2] border font-bold text-xs text-center mt-1"
              />
            </div>
          </div>

          {/* Sparkline Graph */}
          <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7]">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#7A6B63] mb-2">📊 Systolic BP Trend Graph</h4>
            <div className="flex items-end justify-between h-20 pt-3 px-2 border-b border-[#EBE3D7]">
              {vitalsHistory.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] font-bold text-[#E07A5F]">{item.sys}</span>
                  <div style={{ height: `${Math.min(100, (item.sys / 160) * 100)}%` }} className="w-5 rounded-t bg-[#E07A5F]" />
                  <span className="text-[8px] text-[#7A6B63]">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diary Entry */}
          <div className="bg-white p-4 rounded-2xl border border-[#EBE3D7]">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#7A6B63] mb-1">📖 Physical Sensation / Journal Note</h4>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record daily feelings, baby movement, or physical symptoms..."
              className="w-full p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EBE3D7] text-xs"
            />
          </div>

          <button
            onClick={handleSaveVitals}
            disabled={savingVitals}
            className="w-full py-3 rounded-2xl bg-[#E07A5F] text-white font-bold text-xs shadow-md active:scale-95 transition-transform"
          >
            {saveNotice ? "Logged to SQLite ✓" : "Save Vitals & Journal Entry"}
          </button>
        </div>
      )}
    </div>
  );
}