import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { clearLocalUserCache } from "../services/api";

const AuthContext = createContext(null);

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const API_BASE  = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const STORAGE_KEY = "mama-ba-active-user";
const PERSIST_USER_KEY = "mama-ba-persisted-user";
const TOKEN_KEY = "mama-ba-access-token";

function getSavedUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(PERSIST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSavedToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function persistUser(user, token) {
  if (user && user.id) {
    const userId = user.id || user.userId;
    const cleanUser = { ...user, id: userId, userId };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleanUser));
    localStorage.setItem(PERSIST_USER_KEY, JSON.stringify(cleanUser));
    localStorage.setItem("mama_ba_active_user_id", userId);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERSIST_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("mama_ba_active_user_id");
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState]          = useState(getSavedUser);
  const [accessToken, setAccessToken] = useState(getSavedToken);
  const [isLoading, setIsLoading]     = useState(true);

  const setUser = useCallback((valOrFn) => {
    setUserState((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      persistUser(next, accessToken);
      return next;
    });
  }, [accessToken]);

  const updateUser = useCallback((updates) => {
    setUserState((prev) => {
      const next = { ...(prev || {}), ...updates };
      persistUser(next, accessToken);
      return next;
    });
  }, [accessToken]);

  // Restore session on mount
  const refresh = useCallback(async () => {
    const savedUser = getSavedUser();
    const savedToken = getSavedToken();

    if (!savedUser && !savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const userId = savedUser?.id || savedUser?.userId;
      const headers = {};
      if (savedToken) headers["Authorization"] = `Bearer ${savedToken}`;
      if (userId) headers["x-user-id"] = userId;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const freshUser = { ...data.user, id: data.user.id || data.user.userId };
          setAccessToken(data.accessToken || savedToken);
          setUserState(freshUser);
          persistUser(freshUser, data.accessToken || savedToken);
        }
      } else if (savedUser) {
        // Fallback to saved local user session if offline
        setUserState(savedUser);
        setAccessToken(savedToken || "offline-token");
      }
    } catch {
      if (savedUser) {
        setUserState(savedUser);
        setAccessToken(savedToken || "offline-token");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Supabase Auth Listener (Handles OAuth redirects like Google Sign-In) ──
  useEffect(() => {
    if (!supabase || !supabase.auth) return;

    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        console.log("Logged in as:", session.user.email);
        const authenticatedUser = {
          id: session.user.id,
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0],
          fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
        };
        setUserState(authenticatedUser);
        setAccessToken(session.access_token);
        persistUser(authenticatedUser, session.access_token);
      }
    });

    // Listen for login / logout transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        console.log("Session updated:", session.user.email);
        const authenticatedUser = {
          id: session.user.id,
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0],
          fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
        };
        setUserState(authenticatedUser);
        setAccessToken(session.access_token);
        persistUser(authenticatedUser, session.access_token);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = useCallback(async (credentials) => {
    const { email, password } = credentials || {};
    if (!email || !password) throw new Error("Email and password are required");

    // 1. Authenticate with live Express backend
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Invalid email or password");
    }

    const data = await res.json();
    const authenticatedUser = {
      ...data.user,
      id: data.user.id || data.user.userId || `usr_${Date.now()}`
    };

    // 2. Also authenticate / sync with Supabase Auth if available
    try {
      if (supabase && supabase.auth) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
      }
    } catch (e) {
      console.warn("Supabase Auth sync notice:", e);
    }

    setAccessToken(data.accessToken);
    setUserState(authenticatedUser);
    persistUser(authenticatedUser, data.accessToken);
    return authenticatedUser;
  }, []);

  const signup = useCallback(async (credentials) => {
    const { name, email, password, languagePreference } = credentials || {};
    if (!email || !password) throw new Error("Email and password are required");

    // 1. Create account on live Express backend
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, languagePreference }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Couldn't create your account. Please try again.");
    }

    const data = await res.json();
    const newUser = {
      ...data.user,
      id: data.user.id || data.user.userId || `usr_${Date.now()}`
    };

    // 2. Register with Supabase Auth as well
    let supaRes = null;
    try {
      if (supabase && supabase.auth) {
        supaRes = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/`,
            data: { full_name: name }
          }
        }).catch(() => null);
      }
    } catch (e) {
      console.warn("Supabase Auth signup notice:", e);
    }

    // Check if email confirmation is required by Supabase (user object created, session null)
    const verificationPending = Boolean(supaRes?.data?.user && !supaRes?.data?.session);

    if (verificationPending) {
      return { user: newUser, verificationPending: true };
    }

    setAccessToken(data.accessToken);
    setUserState(newUser);
    persistUser(newUser, data.accessToken);
    return { user: newUser, verificationPending: false };
  }, []);

  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) { /* ignore */ }

    try {
      const token = getSavedToken();
      const userObj = getSavedUser();
      if (userObj?.id) {
        clearLocalUserCache(userObj.id);
      }
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (userObj?.id) headers["x-user-id"] = userObj.id;

      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers,
        credentials: "include"
      }).catch(() => {});

      if (supabase && supabase.auth) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch { /* ignore */ }

    setAccessToken(null);
    setUserState(null);
    persistUser(null, null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("mama_ba_active_user_id");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PERSIST_USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.clear();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user),
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