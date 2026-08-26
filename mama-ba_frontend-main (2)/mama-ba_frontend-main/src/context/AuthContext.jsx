import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────
//  Set VITE_DEMO_MODE=true in .env.local to bypass the backend.
//  Remove or set it to false before attaching your real backend.
// ─────────────────────────────────────────────────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api";
const STORAGE_KEY = "mama-ba-demo-user";

// ─── MOCK HELPERS (only used when DEMO_MODE is true) ─────────
async function mockDelay() { await new Promise((r) => setTimeout(r, 450)); }

function mockLogin({ email }) {
  const user = { name: email.split("@")[0], email };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return { accessToken: "demo-token", user };
}

function mockSignup({ name, email }) {
  const user = { name, email };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return { accessToken: "demo-token", user };
}

function mockLogout() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function mockRefresh() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return { accessToken: "demo-token", user: JSON.parse(raw) }; }
  catch { return null; }
}
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);

  // Restore session on mount
  const refresh = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        const data = mockRefresh();
        if (data) { setAccessToken(data.accessToken); setUser(data.user); }
      } else {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("No active session");
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
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
      setUser(data.user);
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
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (credentials) => {
    if (DEMO_MODE) {
      await mockDelay();
      const data = mockSignup(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
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
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      mockLogout();
    } else {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      } catch { /* ignore */ }
    }
    setAccessToken(null);
    setUser(null);
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
      isDemoMode: DEMO_MODE,
    }),
    [user, accessToken, isLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}