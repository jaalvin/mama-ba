import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database } from "lucide-react";
import Navbar from "../components/Navbar.jsx";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p className="text-xs text-on-surface-variant">Last updated: September 2026</p>
          </div>
        </header>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Shield className="w-5 h-5" />
              <h2 className="text-base font-headline">Our Commitment to Maternal Privacy</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              At Mama Ba, we believe health information is deeply personal. We are committed to protecting the privacy of mothers, families, and healthcare providers using our platform.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Database className="w-5 h-5" />
              <h2 className="text-base font-headline">Information We Collect</h2>
            </div>
            <ul className="text-sm text-on-surface-variant space-y-2 list-disc list-inside leading-relaxed">
              <li><strong>Profile Information:</strong> Your name, phone number, and optional gestational age / estimated due date to personalise your timeline.</li>
              <li><strong>Health Entries:</strong> Vitals logs, symptoms, medications, and ANC appointments you choose to record.</li>
              <li><strong>Voice Interactions:</strong> Spoken Twi/English voice prompts are processed securely to return guidance.</li>
              <li><strong>Location Data:</strong> Used strictly on-demand to display nearby pharmacies on Google Maps and never stored or tracked in the background.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Lock className="w-5 h-5" />
              <h2 className="text-base font-headline">Data Security &amp; Local Storage</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              In offline mode and demo mode, your data is stored locally on your device's browser cache. When connected to our cloud services, data transmissions are secured using TLS encryption and token-based authentication.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Eye className="w-5 h-5" />
              <h2 className="text-base font-headline">Your Rights &amp; Data Control</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              You can view, edit, or delete any of your logged health metrics, medications, or appointments at any time through the app. You may also clear your browser's local cache from your Profile settings.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
