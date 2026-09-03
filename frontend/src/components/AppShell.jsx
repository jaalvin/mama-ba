import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import NotificationPanel from "./NotificationPanel.jsx";
import PWAInstallPromptModal from "./PWAInstallPromptModal.jsx";
import { startTipScheduler } from "../services/tipScheduler.js";
import { startPWAReminderEngine } from "../services/reminderEngine.js";

const navItems = [
  { to: "/app", label: { en: "Home", twi: "Fie" }, icon: "home", end: true },
  { to: "/app/ask", label: { en: "Ask", twi: "Bisa" }, icon: "mic" },
  { to: "/app/triage", label: { en: "FAQs", twi: "Nsɛmmisa" }, icon: "help_center" },
  { to: "/app/maternal", label: { en: "Tracker", twi: "Hwɛ" }, icon: "pregnant_woman" },
  { to: "/app/profile", label: { en: "Profile", twi: "Wo Ho" }, icon: "person" },
];

export default function AppShell() {
  const { lang } = useLang();
  const { isDemoMode, isAuthenticated, user } = useAuth();
  const { unreadCount, addNotification } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  // Start pregnancy tip scheduler and PWA reminder engine when user is logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    const activeUid = user?.id || localStorage.getItem("mama_ba_active_user_id") || "guest";
    const stopTips = startTipScheduler(lang, addNotification);
    const stopReminders = startPWAReminderEngine(addNotification, activeUid);
    return () => {
      stopTips();
      stopReminders();
    };
  }, [isAuthenticated, lang, addNotification, user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto w-full md:max-w-md min-h-screen md:shadow-xl md:border-x md:border-outline-variant">

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="fixed top-0 inset-x-0 mx-auto w-full md:max-w-md z-50 bg-earthen-ochre text-white text-center text-xs font-semibold py-1">
            🧪 Demo Mode — no backend connected
          </div>
        )}

        <header
          style={{
            paddingTop: "max(env(safe-area-inset-top, 0px), 0.75rem)",
            height: "calc(3.75rem + env(safe-area-inset-top, 0px))",
          }}
          className={`fixed inset-x-0 mx-auto w-full md:max-w-md z-40 flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm border-b border-outline-variant ${
            isDemoMode ? "top-6" : "top-0"
          }`}
        >
          <span className="font-headline text-headline-md text-primary font-bold">Mama Ba</span>

          {/* Right-side header actions — perfectly aligned on a single straight horizontal line */}
          <div className="flex items-center gap-2">
            {/* Pharmacy button */}
            <NavLink
              to="/app/care"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">local_pharmacy</span>
              <span>{lang === "twi" ? "Nnuro Dwa" : "Pharmacy"}</span>
            </NavLink>

            {/* Notification Bell */}
            <button
              onClick={() => setPanelOpen(true)}
              aria-label={lang === "twi" ? "Hwɛ Nkra" : "View notifications"}
              className="relative p-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {unreadCount > 0 ? "notifications_active" : "notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main
          style={{
            paddingTop: isDemoMode
              ? "calc(5.75rem + env(safe-area-inset-top, 0px))"
              : "calc(4.25rem + env(safe-area-inset-top, 0px))",
            paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))",
          }}
          className="min-h-screen"
        >
          <Outlet />
        </main>

        <nav
          style={{
            paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
          }}
          className="fixed bottom-0 inset-x-0 mx-auto w-full md:max-w-md z-40 flex justify-around items-center px-2 py-2 bg-surface-container border-t border-outline-variant rounded-t-xl"
        >
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

      {/* Notification slide-in panel */}
      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {/* PWA Home Screen Install Pop-Up Modal */}
      <PWAInstallPromptModal />
    </div>
  );
}