import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Ask from "./pages/Ask.jsx";
import Triage from "./pages/Triage.jsx";
import Safety from "./pages/Safety.jsx";
import VitalsJournal from "./pages/VitalsJournal.jsx";
import Tracker from "./pages/Tracker.jsx";
import Logistics from "./pages/Logistics.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ask" element={<Ask />} />
          <Route path="triage" element={<Triage />} />
          <Route path="safety" element={<Safety />} />
          <Route path="vitals" element={<VitalsJournal />} />
          <Route path="tracker" element={<Tracker />} />
          <Route path="logistics" element={<Logistics />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}