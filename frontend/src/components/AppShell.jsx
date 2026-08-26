import { NavLink, Outlet } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/app", label: { en: "Home", twi: "Fie" }, icon: "home", end: true },
  { to: "/app/ask", label: { en: "Ask", twi: "Bisa" }, icon: "mic" },
  { to: "/app/triage", label: { en: "Symptoms", twi: "Yadeɛ" }, icon: "health_and_safety" },
  { to: "/app/maternal", label: { en: "Tracker", twi: "Hwɛ" }, icon: "pregnant_woman" },
  { to: "/app/profile", label: { en: "Profile", twi: "Wo Ho" }, icon: "person" },
];

export default function AppShell() {
  const { lang } = useLang();
  const { isDemoMode } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto w-full md:max-w-md min-h-screen md:shadow-xl md:border-x md:border-outline-variant">

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="fixed top-0 inset-x-0 mx-auto w-full md:max-w-md z-50 bg-earthen-ochre text-white text-center text-xs font-semibold py-1">
            🧪 Demo Mode — no backend connected
          </div>
        )}

        <header className={`fixed inset-x-0 mx-auto w-full md:max-w-md z-40 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-sm border-b border-outline-variant ${isDemoMode ? "top-6" : "top-0"}`}>
          <span className="font-headline text-headline-md text-primary font-bold">Mama Ba</span>
          <NavLink
            to="/app/care"
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">local_pharmacy</span>
            {lang === "twi" ? "Nnuro Dwa" : "Pharmacy"}
          </NavLink>
        </header>

        <main className={`pb-24 min-h-screen ${isDemoMode ? "pt-20" : "pt-14"}`}>
          <Outlet />
        </main>

        <nav className="fixed bottom-0 inset-x-0 mx-auto w-full md:max-w-md z-40 flex justify-around items-center px-2 py-2 bg-surface-container border-t border-outline-variant rounded-t-xl">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-1 rounded-2xl transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`
              }
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-xs mt-1">{lang === "twi" ? item.label.twi : item.label.en}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}