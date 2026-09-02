import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, CheckCircle2, PhoneCall } from "lucide-react";
import Navbar from "../components/Navbar.jsx";

export default function HealthDisclaimer() {
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
              Health &amp; Medical Disclaimer
            </h1>
            <p className="text-xs text-on-surface-variant">Important Information for Mothers &amp; Families</p>
          </div>
        </header>

        <div className="bg-tertiary-container/30 border border-tertiary/20 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-tertiary" />
            <h2 className="font-semibold text-on-surface text-base">Not a Substitute for Professional Medical Care</h2>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The educational content, triage recommendations, herbal reviews, and timeline calculations provided in Mama Ba are for general informational and supportive purposes only.
          </p>
        </div>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
          <h3 className="text-label-md text-on-surface uppercase tracking-wider font-semibold">Key Safety Principles</h3>
          
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm text-on-surface block mb-0.5">Always Consult Qualified Healthcare Providers:</strong>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Always seek advice from a licensed medical doctor, midwife, obstetrician, or clinical specialist regarding symptoms, medications, or health conditions during pregnancy and postpartum.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm text-on-surface block mb-0.5">Herbal &amp; Traditional Remedies Caution:</strong>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Herbal safety notes are grounded in pharmacology and recognized research databases. Never replace prescribed obstetric medications with herbal preparations without physician consultation.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm text-on-surface block mb-0.5">Obstetric Emergencies:</strong>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                If you experience severe bleeding, intense abdominal pain, sudden blurred vision, severe headache, or high fever during pregnancy, visit your nearest emergency clinic or call Ghana National Ambulance Services immediately.
              </p>
            </div>
          </div>
        </section>

        <div className="bg-error-container/30 border border-error/20 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-6 h-6 text-error shrink-0" />
            <div>
              <p className="text-xs font-semibold text-error uppercase tracking-wider">Ghana Emergency Lines</p>
              <p className="text-sm font-bold text-on-surface">112 (National Ambulance) • 193 (Emergency)</p>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-4 py-2 bg-error text-on-error rounded-full text-xs font-bold shadow-sm hover:bg-error/90 transition-colors shrink-0"
          >
            Call 112
          </a>
        </div>
      </main>
    </div>
  );
}