import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function HealthDisclaimer() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>
        <h1 className="font-headline text-headline-sm text-on-surface">Health Disclaimer</h1>
      </header>

      <div className="bg-tertiary-container/30 border border-tertiary/20 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-tertiary" />
          <h2 className="font-semibold text-on-surface">Not Medical Advice</h2>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The educational content, triage recommendations, and herbal safety information provided in Mama Ba are for general informational purposes only.
        </p>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-label-md text-on-surface uppercase tracking-wider">Key Safety Guidelines</h3>
        
        <div className="flex gap-3 items-start">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-on-surface leading-relaxed">
            <strong>Consult Healthcare Providers:</strong> Always seek advice from a qualified doctor, midwife, or clinical specialist regarding medical conditions or symptom triage.
          </p>
        </div>

        <div className="flex gap-3 items-start">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-on-surface leading-relaxed">
            <strong>Herbal Remedies Caution:</strong> Herbal safety guidance is based on traditional safety databases and pharmacological literature. Never replace prescribed obstetric medications with herbal preparations without physician consultation.
          </p>
        </div>

        <div className="flex gap-3 items-start">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-on-surface leading-relaxed">
            <strong>Emergency Triage:</strong> If you experience severe bleeding, intense abdominal pain, sudden vision changes, or high fever during pregnancy, visit an emergency unit immediately.
          </p>
        </div>
      </section>
    </div>
  );
}