import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/app", label: "Home", icon: "🏠", end: true },
  { to: "/app/ask", label: "Ask", icon: "🎙️" },
  { to: "/app/triage", label: "Triage", icon: "🚨" },
  { to: "/app/safety", label: "Safety", icon: "🌿" },
  { to: "/app/vitals", label: "Vitals", icon: "🩺" },
  { to: "/app/tracker", label: "Tracker", icon: "🤰" },
  { to: "/app/logistics", label: "Logistics", icon: "📍" },
  { to: "/app/profile", label: "Profile", icon: "👤" },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D231E]">
      <div className="relative mx-auto w-full md:max-w-md min-h-screen md:shadow-xl md:border-x md:border-[#EBE3D7]">
        <header className="fixed top-0 inset-x-0 mx-auto w-full md:max-w-md z-40 flex items-center justify-between h-14 px-4 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#EBE3D7]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌺</span>
            <span className="font-bold text-base text-[#2D231E]">Mama Ba</span>
          </div>
          <span className="text-[10px] bg-[#E07A5F]/15 text-[#E07A5F] px-2.5 py-1 rounded-full font-bold">
            GHS Guided Companion
          </span>
        </header>

        <main className="pt-16 pb-24 min-h-screen">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 inset-x-0 mx-auto w-full md:max-w-md z-40 flex justify-between items-center px-1.5 py-2 bg-white border-t border-[#EBE3D7] rounded-t-2xl shadow-lg">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#E07A5F] text-white shadow-xs font-bold scale-105"
                    : "text-[#7A6B63] hover:text-[#2D231E]"
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}