import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
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
import Vitals from "./pages/Vitals.jsx";
import Maternal from "./pages/Maternal.jsx";
import CareLogistics from "./pages/CareLogistics.jsx";
import Profile from "./pages/Profile.jsx";
import EmergencyContacts from "./pages/EmergencyContacts.jsx";
import HealthDisclaimer from "./pages/HealthDisclaimer.jsx";
import PrivacyData from "./pages/PrivacyData.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";
import ContactSupport from "./pages/ContactSupport.jsx";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Public Legal & Support Routes */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/health-disclaimer" element={<HealthDisclaimer />} />
            <Route path="/contact" element={<ContactSupport />} />

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
              <Route path="vitals" element={<Vitals />} />
              <Route path="maternal" element={<Maternal />} />
              <Route path="care" element={<CareLogistics />} />

              {/* Profile Root & Sub-pages */}
              <Route path="profile" element={<Profile />} />
              <Route path="profile/emergency-contacts" element={<EmergencyContacts />} />
              <Route path="profile/health-disclaimer" element={<HealthDisclaimer />} />
              <Route path="profile/privacy-data" element={<PrivacyData />} />
              <Route path="profile/change-password" element={<ChangePassword />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}