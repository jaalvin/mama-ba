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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const uid = parsed?.id || parsed?.userId || localStorage.getItem("mama_ba_active_user_id");
    if (uid) {
      const storedDueDate = localStorage.getItem(`mama_ba_usr_${uid}_due_date`);
      if (storedDueDate) {
        parsed.dueDate = storedDueDate;
      }
    }
    return parsed;
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
  if (user && (user.id || user.userId)) {
    const userId = user.id || user.userId;
    const cleanUser = { ...user, id: userId, userId };
    if (cleanUser.dueDate) {
      localStorage.setItem(`mama_ba_usr_${userId}_due_date`, cleanUser.dueDate);
    }
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

  // Restore session on mount — behave like a native app:
  // Always restore from localStorage immediately so the user is never asked
  // to sign in again after closing and re-opening the app.
  const refresh = useCallback(async () => {
    const savedUser = getSavedUser();
    const savedToken = getSavedToken();

    if (!savedUser) {
      setIsLoading(false);
      return;
    }

    // ── Step 1: Restore from local storage immediately (no network required) ──
    // This ensures the UI loads instantly like a native mobile app.
    setUserState(savedUser);
    setAccessToken(savedToken || "offline-token");
    setIsLoading(false);

    // ── Step 2: Silently try to get a fresh token in the background ──
    // A failure here NEVER logs the user out — we just keep using the saved session.
    try {
      const userId = savedUser?.id || savedUser?.userId;
      const headers = { "Content-Type": "application/json" };
      if (savedToken) headers["Authorization"] = `Bearer ${savedToken}`;
      if (userId) headers["x-user-id"] = userId;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user && data.accessToken) {
          const freshUser = { ...data.user, id: data.user.id || data.user.userId };
          setAccessToken(data.accessToken);
          setUserState(freshUser);
          persistUser(freshUser, data.accessToken);
        }
      }
      // If not ok, we silently stay with the saved session — no logout.
    } catch {
      // Network offline or backend down — stay logged in with saved session.
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Supabase Auth Listener (Handles OAuth redirects like Google Sign-In) ──
  useEffect(() => {
    if (!supabase || !supabase.auth) return;

    const isOAuthCallback = window.location.hash.includes("access_token") || window.location.search.includes("code=");
    if (isOAuthCallback) {
      setIsLoading(true);
    }

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

        // If user hasn't onboarded yet and landed on /app, direct them to /onboarding
        const hasOnboarded = localStorage.getItem(`mama_ba_onboarded_${session.user.id}`);
        if (!hasOnboarded && window.location.pathname.startsWith("/app")) {
          window.location.href = "/onboarding";
        }
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
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
    try {
      if (supabase && supabase.auth) {
        const { data: suData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/`,
            data: { full_name: name }
          }
        }).catch((e) => {
          console.warn("Supabase Auth signup notice:", e);
          return { data: null };
        });

        const sUser = suData?.user;
        const uid = sUser?.id || newUser.id;

        // Populate public.user_profile table in Supabase
        await supabase.from('user_profile').upsert({
          user_id: uid,
          email: email,
          full_name: name,
          language_preference: languagePreference || 'twi'
        }).catch((e) => {
          console.warn("Supabase user_profile table notice:", e);
        });
      }
    } catch (e) {
      console.warn("Supabase Auth signup notice:", e);
    }

    // Always log the user in immediately so they enter the app directly without blocking
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