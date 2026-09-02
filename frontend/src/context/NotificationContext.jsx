import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { notifications as notifAPI } from "../services/api.js";
import { requestNotificationPermission, showDeviceNotification } from "../services/notifications.js";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { accessToken } = useAuth();
  const [items, setItems]       = useState([]);
  const [isLoading, setLoading] = useState(true);

  // Request device permission on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Load notifications when token is available
  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    notifAPI.list(accessToken)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const addNotification = useCallback(
    async ({ type = "info", titleEn, titleTwi, bodyEn, bodyTwi }) => {
      const item = await notifAPI.create(accessToken, { type, titleEn, titleTwi, bodyEn, bodyTwi });
      setItems((prev) => [item, ...prev]);
      // Mirror to device notification
      showDeviceNotification(titleEn, bodyEn);
    },
    [accessToken]
  );

  const markRead = useCallback(async (id) => {
    await notifAPI.markRead(accessToken, id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, [accessToken]);

  const markAllRead = useCallback(async () => {
    await notifAPI.markAllRead(accessToken);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [accessToken]);

  const remove = useCallback(async (id) => {
    await notifAPI.remove(accessToken, id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, [accessToken]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({ notifications: items, unreadCount, isLoading, addNotification, markRead, markAllRead, remove }),
    [items, unreadCount, isLoading, addNotification, markRead, markAllRead, remove]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
