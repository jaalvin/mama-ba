import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────
//  Set VITE_DEMO_MODE=true in .env.local to bypass the backend.
//  Remove or set it to false before attaching your real backend.
// ─────────────────────────────────────────────────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const STORAGE_KEY = "mama-ba-demo-user";
const PERSIST_USER_KEY = "mama-ba-persisted-user";

function getSavedUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(PERSIST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (user && user.id) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(PERSIST_USER_KEY, JSON.stringify(user));
    localStorage.setItem("mama_ba_active_user_id", user.id);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERSIST_USER_KEY);
    localStorage.removeItem("mama_ba_active_user_id");
  }
}

// Helper to generate deterministic user ID from email or string
function generateUserId(email) {
  let hash = 0;
  const str = (email || "user").toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `usr_${Math.abs(hash)}`;
}

// ─── MOCK HELPERS (only used when DEMO_MODE is true) ─────────
async function mockDelay() { await new Promise((r) => setTimeout(r, 200)); }

function mockLogin({ email }) {
  const existing = getSavedUser();
  const uid = existing?.id || generateUserId(email);
  const user = { id: uid, name: email.split("@")[0], email, ...existing };
  persistUser(user);
  return { accessToken: "demo-token", user };
}

function mockSignup({ name, email }) {
  const uid = generateUserId(email);
  const user = { id: uid, name, email };
  persistUser(user);
  return { accessToken: "demo-token", user };
}

function mockLogout() {
  persistUser(null);
}

function mockRefresh() {
  const user = getSavedUser();
  if (!user) return null;
  return { accessToken: "demo-token", user };
}
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUserState]          = useState(getSavedUser);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);

  const setUser = useCallback((valOrFn) => {
    setUserState((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      persistUser(next);
      return next;
    });
  }, []);

  const updateUser = useCallback((updates) => {
    setUserState((prev) => {
      const next = { ...(prev || {}), ...updates };
      persistUser(next);
      return next;
    });
  }, []);

  // Restore session on mount
  const refresh = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        const data = mockRefresh();
        if (data) {
          setAccessToken(data.accessToken);
          setUserState(data.user);
        }
      } else {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("No active session");
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUserState(data.user);
        persistUser(data.user);
      }
    } catch {
      setAccessToken(null);
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (credentials) => {
    if (DEMO_MODE) {
      await mockDelay();
      const data = mockLogin(credentials);
      setAccessToken(data.accessToken);
      setUserState(data.user);
      return data.user;
    }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Invalid email or password");
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    setUserState(data.user);
    persistUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (credentials) => {
    if (DEMO_MODE) {
      await mockDelay();
      const data = mockSignup(credentials);
      setAccessToken(data.accessToken);
      setUserState(data.user);
      return data.user;
    }
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Couldn't create your account. Try again.");
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    setUserState(data.user);
    persistUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) { /* ignore */ }

    if (DEMO_MODE) {
      mockLogout();
    } else {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      } catch { /* ignore */ }
    }
    setAccessToken(null);
    setUserState(null);
    persistUser(null);

    // Hard reset user active ID and session storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("mama_ba_active_user_id");
      sessionStorage.clear();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isLoading,
      login,
      signup,
      logout,
      setUser,
      updateUser,
      isDemoMode: DEMO_MODE,
    }),
    [user, accessToken, isLoading, login, signup, logout, setUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}