import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { X, Loader2 } from "lucide-react";

const TYPE_META = {
  reminder: { icon: "medication",     color: "text-primary",       bg: "bg-primary/10" },
  info:     { icon: "info",           color: "text-forest-green",  bg: "bg-forest-green/10" },
  warning:  { icon: "event",          color: "text-earthen-ochre", bg: "bg-earthen-ochre/10" },
};

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, isLoading, markAllRead, markRead, remove } = useNotifications();
  const { lang } = useLang();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const panelRef = useRef(null);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={lang === "twi" ? "Nkra Nhyiamu" : "Notifications"}
        className={`fixed inset-x-0 mx-auto w-full md:max-w-md bottom-0 z-[70]
          bg-surface rounded-t-3xl shadow-2xl flex flex-col
          transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "80vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <h2 className="font-headline text-headline-md text-on-surface">
            {lang === "twi" ? "Nkra" : "Notifications"}
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-semibold text-primary">
                ({unreadCount} {lang === "twi" ? "foforo" : "new"})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary font-semibold px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
              >
                {lang === "twi" ? "Kenkan nyinaa" : "Mark all read"}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <ul className="overflow-y-auto flex-1 divide-y divide-outline-variant">
          {isLoading && (
            <li className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </li>
          )}

          {!isLoading && notifications.length === 0 && (
            <li className="flex flex-col items-center gap-3 py-14 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl opacity-40">notifications_none</span>
              <p className="text-sm">
                {lang === "twi" ? "Nkra biara nni hɔ" : "No notifications yet"}
              </p>
              <p className="text-xs opacity-60 text-center px-8">
                {lang === "twi"
                  ? "Nnuro bere, nhyiam akae, ne apomuden nkae bɛba ha."
                  : "Medication times, appointment reminders, and health alerts will appear here."}
              </p>
            </li>
          )}

          {!isLoading && notifications.map((notif) => {
            const meta  = TYPE_META[notif.type] ?? TYPE_META.info;
            const title = lang === "twi" ? notif.titleTwi : notif.titleEn;
            const body  = lang === "twi" ? notif.bodyTwi  : notif.bodyEn;
            return (
              <li
                key={notif.id}
                className={`flex gap-3 px-4 py-4 transition-colors ${notif.read ? "bg-surface" : "bg-primary/5"}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${meta.bg}`}>
                  <span className={`material-symbols-outlined text-[20px] ${meta.color}`}>{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => markRead(notif.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${notif.read ? "font-normal text-on-surface-variant" : "font-semibold text-on-surface"}`}>
                      {title}
                    </p>
                    {!notif.read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                  </div>
                  {body && (
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed line-clamp-2">{body}</p>
                  )}
                  <p className="text-xs text-outline mt-1">{relativeTime(notif.createdAt)}</p>
                </div>
                <button
                  onClick={() => remove(notif.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors self-start mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
