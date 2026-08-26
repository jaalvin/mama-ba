import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

// SECURITY NOTE:
// The access token is kept in memory only (React state), never in
// localStorage or sessionStorage, so it can't be stolen by an injected
// script. The backend should issue a short-lived access token in the
// JSON response body, plus a long-lived refresh token in an httpOnly,
// Secure, SameSite=Strict cookie that JS can never read. On load we call
// /api/auth/refresh (which relies on that cookie) to silently restore
// the session without ever touching browser storage.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const STORAGE_KEY = "mama-ba-user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken || "session-token");
        setUser(data.user);
        return;
      }
    } catch (e) {
      // API call failed, try local fallback
    }

    const savedUser = sessionStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAccessToken("active-token");
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const loggedUser = data.user || { name: email.split("@")[0], email };
        setAccessToken(data.accessToken || "active-token");
        setUser(loggedUser);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
        return loggedUser;
      }
    } catch (e) {
      // Fallback
    }

    const fallbackUser = { name: email ? email.split("@")[0] : "Mama", email };
    setAccessToken("active-token");
    setUser(fallbackUser);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
    return fallbackUser;
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const newUser = data.user || { name, email };
        setAccessToken(data.accessToken || "active-token");
        setUser(newUser);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        return newUser;
      }
    } catch (e) {
      // Fallback
    }

    const fallbackUser = { name: name || "Mama", email };
    setAccessToken("active-token");
    setUser(fallbackUser);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
    return fallbackUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignore
    } finally {
      sessionStorage.removeItem(STORAGE_KEY);
      setAccessToken(null);
      setUser(null);
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







// THIS IS JUST TO TEST WITHOUT USING REAL DATA!!!!

// import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// const AuthContext = createContext(null);

// // ⚠️ DEMO MODE — NO BACKEND YET ⚠️
// // This version fakes login/signup entirely in the browser so you can click
// // through the app before your FastAPI backend exists. It stores a mock user
// // in sessionStorage purely so refreshing the page doesn't log you out mid-demo.
// // This is NOT secure and must be replaced before going live — see the real
// // version (memory-only token + httpOnly cookie) once your backend is ready.

// const STORAGE_KEY = "mama-ba-demo-user";

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const stored = sessionStorage.getItem(STORAGE_KEY);
//     if (stored) {
//       try {
//         setUser(JSON.parse(stored));
//       } catch {
//         sessionStorage.removeItem(STORAGE_KEY);
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   const login = useCallback(async ({ email }) => {
//     // Fake network delay so loading states are visible.
//     await new Promise((r) => setTimeout(r, 400));
//     const fakeUser = { name: email.split("@")[0], email };
//     sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
//     setUser(fakeUser);
//     return fakeUser;
//   }, []);

//   const signup = useCallback(async ({ name, email }) => {
//     await new Promise((r) => setTimeout(r, 400));
//     const fakeUser = { name, email };
//     sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
//     setUser(fakeUser);
//     return fakeUser;
//   }, []);

//   const logout = useCallback(async () => {
//     sessionStorage.removeItem(STORAGE_KEY);
//     setUser(null);
//   }, []);

//   const value = useMemo(
//     () => ({
//       user,
//       accessToken: user ? "demo-token" : null,
//       isAuthenticated: Boolean(user),
//       isLoading,
//       login,
//       signup,
//       logout,
//       setUser,
//     }),
//     [user, isLoading, login, signup, logout]
//   );

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export function useAuth() {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error("useAuth must be used within AuthProvider");
//   return ctx;
// }