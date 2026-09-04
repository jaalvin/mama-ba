import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import NotificationPanel from "./NotificationPanel.jsx";
import PWAInstallPromptModal from "./PWAInstallPromptModal.jsx";
import { startTipScheduler, syncDailyTipPushReminders } from "../services/tipScheduler.js";
import { startPWAReminderEngine, syncMedicationPushReminders } from "../services/reminderEngine.js";
import { subscribeToPush } from "../services/notifications.js";

const navItems = [
  { to: "/app", label: { en: "Home", twi: "Fie" }, icon: "home", end: true },
  { to: "/app/ask", label: { en: "Ask", twi: "Bisa" }, icon: "mic" },
  { to: "/app/triage", label: { en: "FAQs", twi: "Nsɛmmisa" }, icon: "help_center" },
  { to: "/app/maternal", label: { en: "Tracker", twi: "Hwɛ" }, icon: "pregnant_woman" },
  { to: "/app/profile", label: { en: "Profile", twi: "Wo Ho" }, icon: "person" },
];

export default function AppShell() {
  const location = useLocation();
  const { lang } = useLang();
  const { isDemoMode, isAuthenticated, user, accessToken } = useAuth();
  const { unreadCount, addNotification } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);

  const isAskPage = location.pathname === "/app/ask";
  const shouldHideNav = hideNav || isAskPage;

  useEffect(() => {
    const handleVoiceToggle = (e) => {
      if (e && e.detail) {
        setHideNav(Boolean(e.detail.open));
      }
    };
    window.addEventListener("mama_ba_voice_chat_toggle", handleVoiceToggle);
    return () => window.removeEventListener("mama_ba_voice_chat_toggle", handleVoiceToggle);
  }, []);

  // Start reminder engine + tip scheduler when logged in
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

  // Subscribe to Web Push and sync all reminders (meds + daily tips) to backend scheduler
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const activeUid = user.id;
    const token = accessToken || "";

    // Subscribe this device to Web Push (enables background/lock-screen notifications)
    subscribeToPush(activeUid, token).catch(() => {});

    // Sync medication reminders & daily reshuffled tips to backend push scheduler
    syncMedicationPushReminders(activeUid, token).catch(() => {});
    syncDailyTipPushReminders(activeUid, token).catch(() => {});
  }, [isAuthenticated, user?.id, accessToken]);

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
          className={`fixed inset-x-0 mx-auto w-full md:max-w-md z-40 flex items-center justify-between px-4 ios-liquid-header ${
            isDemoMode ? "top-6" : "top-0"
          }`}
        >
          <span className="font-headline text-headline-md text-primary font-bold tracking-tight">Mama Ba</span>

          {/* Right-side header actions — aligned with iOS glassy pill badges */}
          <div className="flex items-center gap-2">
            {/* Pharmacy button */}
            <NavLink
              to="/app/care"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/80 text-xs font-semibold text-on-surface-variant hover:text-primary transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">local_pharmacy</span>
              <span>{lang === "twi" ? "Nnuro Dwa" : "Pharmacy"}</span>
            </NavLink>

            {/* Notification Bell */}
            <button
              onClick={() => setPanelOpen(true)}
              aria-label={lang === "twi" ? "Hwɛ Nkra" : "View notifications"}
              className="relative p-2 rounded-full bg-white/90 backdrop-blur-md border border-white/80 text-on-surface-variant hover:text-primary transition-all flex items-center justify-center shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">
                {unreadCount > 0 ? "notifications_active" : "notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[13px] h-[13px] px-0.5 bg-error text-on-error text-[8px] font-extrabold rounded-full flex items-center justify-center leading-none shadow-xs border border-white/90 transform translate-x-0.5 -translate-y-0.5">
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
            paddingBottom: isAskPage
              ? "env(safe-area-inset-bottom, 0px)"
              : "calc(6.5rem + env(safe-area-inset-bottom, 0px))",
          }}
          className="min-h-screen"
        >
          <Outlet />
        </main>

        {/* Floating WhatsApp-Style iOS Translucent Liquid Glass Navigation Bar */}
        <nav
          style={{
            bottom: typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? "max(calc(env(safe-area-inset-bottom, 0px) * 0.25), 6px)"
              : "6px",
          }}
          className={`fixed inset-x-3.5 mx-auto w-[calc(100%-1.75rem)] md:w-[410px] z-50 flex justify-between items-center px-3 py-1.5 rounded-[26px] whatsapp-glass-nav transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ${
            shouldHideNav ? "opacity-0 pointer-events-none translate-y-12 scale-95" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center px-3 py-1.5 rounded-[20px] transition-all duration-200 ${
                  isActive
                    ? "whatsapp-glass-tab-active scale-105"
                    : "whatsapp-glass-tab-inactive hover:bg-white/10"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "text-on-surface font-bold" : "text-on-surface-variant/80"}`}>
                    {lang === "twi" ? item.label.twi : item.label.en}
                  </span>
                </>
              )}
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