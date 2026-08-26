import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";

export default function Tracker() {
  const [activeTab, setActiveTab] = useState("anc"); // 'anc' or 'vaccines'
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const [ancVisits, setAncVisits] = useState([
    { id: 1, week: 8, titleEn: "ANC Visit 1 (Registration)", titleTw: "Kɔ asopiti 1", focus: "First trimester screening, BP baseline, iron prescription.", completed: true },
    { id: 2, week: 20, titleEn: "ANC Visit 2 (Anomaly Scan)", titleTw: "Kɔ asopiti 2", focus: "Fetal growth check, second dose Tetanus (TT2).", completed: true },
    { id: 3, week: 26, titleEn: "ANC Visit 3 (Anemia Check)", titleTw: "Kɔ asopiti 3", focus: "Glucose tolerance test, hemoglobin (Hb) blood count.", completed: false, isNext: true },
    { id: 4, week: 30, titleEn: "ANC Visit 4 (Wellbeing)", titleTw: "Kɔ asopiti 4", focus: "Pre-eclampsia screening, blood pressure monitoring.", completed: false },
    { id: 5, week: 34, titleEn: "ANC Visit 5 (Birth Plan)", titleTw: "Kɔ asopiti 5", focus: "Delivery preparedness, emergency referral path.", completed: false },
    { id: 6, week: 36, titleEn: "ANC Visit 6 (Presentation)", titleTw: "Kɔ asopiti 6", focus: "Baby position check, fetal movement monitoring.", completed: false },
    { id: 7, week: 38, titleEn: "ANC Visit 7 (Term Assessment)", titleTw: "Kɔ asopiti 7", focus: "Cervical readiness and labor sign review.", completed: false },
    { id: 8, week: 40, titleEn: "ANC Visit 8 (Delivery Readiness)", titleTw: "Kɔ asopiti 8", focus: "Final delivery checkup at GHS health center.", completed: false }
  ]);

  const [vaccines, setVaccines] = useState([
    { id: "v1", timing: "Birth", vaccine: "BCG & OPV-0 (Polio)", focus: "Tuberculosis and Oral Polio protection.", completed: true },
    { id: "v2", timing: "6 Weeks", vaccine: "Penta-1, PCV-1, Rota-1, OPV-1", focus: "DTP, Hepatitis B, Hib, Pneumococcal, Rotavirus.", completed: false, isNext: true },
    { id: "v3", timing: "10 Weeks", vaccine: "Penta-2, PCV-2, Rota-2, OPV-2", focus: "Second routine booster immunization doses.", completed: false },
    { id: "v4", timing: "14 Weeks", vaccine: "Penta-3, PCV-3, IPV, OPV-3", focus: "Third primary series & Inactivated Polio.", completed: false },
    { id: "v5", timing: "9 Months", vaccine: "Measles-Rubella 1 & Yellow Fever", focus: "Measles and Yellow Fever immunization.", completed: false }
  ]);

  const toggleAncCompleted = (id) => {
    setAncVisits(prev => 
      prev.map(v => v.id === id ? { ...v, completed: !v.completed } : v)
    );
  };

  const toggleVaccineCompleted = (id) => {
    setVaccines(prev => 
      prev.map(v => v.id === id ? { ...v, completed: !v.completed } : v)
    );
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto flex flex-col gap-6 text-[#2D231E]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🤰</span>
          <h1 className="font-bold text-xl text-[#2D231E]">Maternal &amp; Childcare Tracker</h1>
        </div>
        <p className="text-xs text-[#7A6B63]">
          GHS 8-Visit Antenatal Care Timeline and Childhood Vaccine Milestones.
        </p>
      </div>

      {/* Offline Reminder Toggle Switch */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#EBE3D7] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔔</span>
          <div>
            <p className="font-bold text-xs text-[#2D231E]">Local Notification Reminders</p>
            <p className="text-[10px] text-[#7A6B63]">Offline device alerts for scheduled visits</p>
          </div>
        </div>
        <button
          onClick={() => setRemindersEnabled(!remindersEnabled)}
          className={`w-12 h-6 rounded-full p-1 transition-colors ${
            remindersEnabled ? "bg-[#E07A5F]" : "bg-gray-300"
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
            remindersEnabled ? "translate-x-6" : "translate-x-0"
          }`} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-[#EBE3D7] shadow-xs">
        <button
          onClick={() => setActiveTab("anc")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "anc"
              ? "bg-[#E07A5F] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          Maternal 8 ANC Visits
        </button>
        <button
          onClick={() => setActiveTab("vaccines")}
          className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "vaccines"
              ? "bg-[#3D405B] text-white shadow-sm"
              : "text-[#7A6B63] hover:text-[#2D231E]"
          }`}
        >
          Childhood Vaccines
        </button>
      </div>

      {/* Tab Content 1: ANC Timeline */}
      {activeTab === "anc" && (
        <div className="flex flex-col gap-3">
          {ancVisits.map((v) => (
            <div
              key={v.id}
              onClick={() => toggleAncCompleted(v.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                v.completed
                  ? "bg-emerald-50 border-emerald-200"
                  : v.isNext
                  ? "bg-[#E07A5F] text-white border-[#E07A5F]"
                  : "bg-white border-[#EBE3D7] text-[#2D231E]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={v.completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-[#E07A5F] cursor-pointer"
                  />
                  <h3 className={`font-bold text-sm ${v.isNext && !v.completed ? "text-white" : "text-[#2D231E]"}`}>
                    {v.titleEn}
                  </h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  v.completed
                    ? "bg-emerald-200 text-emerald-900"
                    : v.isNext
                    ? "bg-white text-[#E07A5F]"
                    : "bg-[#FAF7F2] text-[#7A6B63]"
                }`}>
                  {v.completed ? "Completed ✓" : v.isNext ? "Scheduled Next" : `Week ${v.week}`}
                </span>
              </div>

              <p className={`text-xs ml-6 ${v.isNext && !v.completed ? "text-white/90" : "text-[#7A6B63]"}`}>
                {v.focus}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content 2: Immunization Tracker */}
      {activeTab === "vaccines" && (
        <div className="flex flex-col gap-3">
          {vaccines.map((vac) => (
            <div
              key={vac.id}
              onClick={() => toggleVaccineCompleted(vac.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                vac.completed
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : vac.isNext
                  ? "bg-[#3D405B] text-white border-[#3D405B]"
                  : "bg-white border-[#EBE3D7] text-[#2D231E]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vac.completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-[#3D405B] cursor-pointer"
                  />
                  <h3 className="font-bold text-sm">{vac.vaccine}</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  vac.completed
                    ? "bg-emerald-200 text-emerald-900"
                    : vac.isNext
                    ? "bg-white text-[#3D405B]"
                    : "bg-[#FAF7F2] text-[#7A6B63]"
                }`}>
                  {vac.completed ? "Completed ✓" : vac.timing}
                </span>
              </div>

              <p className={`text-xs ml-6 ${vac.isNext && !vac.completed ? "text-white/90" : "text-[#7A6B63]"}`}>
                {vac.focus}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}