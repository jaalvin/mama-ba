import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import Navbar from "../components/Navbar.jsx";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-body text-body-md">
      <Navbar />

      <main className="pt-24 pb-16 px-4 md:px-6 max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-on-surface" />
          </button>
          <div>
            <h1 className="font-headline text-headline-md md:text-headline-lg text-primary font-bold">
              Terms of Service
            </h1>
            <p className="text-xs text-on-surface-variant">Last updated: September 2026</p>
          </div>
        </header>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <FileText className="w-5 h-5" />
              <h2 className="text-base font-headline">1. Acceptance of Terms</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              By accessing or using the Mama Ba platform, mobile PWA, or voice assistant, you agree to be bound by these Terms of Service and our Health Disclaimer.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="text-base font-headline">2. Purpose of the Platform</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Mama Ba is designed as an educational, informational, and organizational companion for pregnant women, new mothers, and caregivers in Ghana. It helps organize ANC schedules, medication routines, vitals tracking, and basic symptom education.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-error font-semibold">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-base font-headline">3. Emergency Situations &amp; Medical Consultation</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Mama Ba is not an emergency response dispatch service. In the event of severe medical distress, heavy bleeding, high fever, or labor complications, immediately contact your nearest hospital, midwife, or dial Ghana National Ambulance Services (112 / 193).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <HelpCircle className="w-5 h-5" />
              <h2 className="text-base font-headline">4. User Accounts &amp; Conduct</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              You agree to provide accurate information when registering and to keep your credentials secure. You may not misuse the service or attempt to reverse-engineer our clinical triage logic.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
