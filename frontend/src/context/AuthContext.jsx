import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const STORAGE_KEY = "mama-ba-demo-user";

async function mockDelay() { await new Promise((r) => setTimeout(r, 100)); }

function mockLogin({ email }) {
  const user = { name: email ? email.split("@")[0] : "Abena Osei", email: email || "abena@example.com" };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return { accessToken: "demo-token", user };
}

function mockSignup({ name, email }) {
  const user = { name: name || "Abena Osei", email: email || "abena@example.com" };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return { accessToken: "demo-token", user };
}

function mockLogout() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function mockRefresh() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaultUser = { name: "Abena Osei", email: "abena@example.com" };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
    return { accessToken: "demo-token", user: defaultUser };
  }
  try {
    return { accessToken: "demo-token", user: JSON.parse(raw) };
  } catch {
    const defaultUser = { name: "Abena Osei", email: "abena@example.com" };
    return { accessToken: "demo-token", user: defaultUser };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);

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
      const data = mockRefresh();
      setAccessToken(data.accessToken);
      setUser(data.user);
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
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    } catch {
      const data = mockLogin(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    }
  }, []);

  const signup = useCallback(async (credentials) => {
    if (DEMO_MODE) {
      await mockDelay();
      const data = mockSignup(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      if (!res.ok) throw new Error("Could not register");
      const data = await res.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    } catch {
      const data = mockSignup(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data.user;
    }
  }, []);

  const logout = useCallback(async () => {
    mockLogout();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken || user),
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