import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

const features = [
  {
    icon: "mic",
    title: "Twi Voice Q&A",
    body: "Speak directly to the app in Twi to ask your medical questions. Our voice recognition understands natural phrasing, so you get clear answers without typing or translating.",
  },
  {
    icon: "health_and_safety",
    title: "Offline Symptom Triage",
    body: "No internet? No problem. Our AI-driven triage system works offline, providing critical 'Big Sister' guidance when you need it most.",
  },
  {
    icon: "timeline",
    title: "GHS Health Timelines",
    body: "Stay on track with visually clear timelines for Antenatal Care (ANC) and immunizations, fully compliant with Ghana Health Service standards.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "app_registration",
    title: "Create Your Profile",
    body: "Sign up in seconds and enter your due date, health details, and language preference. Mama Ba personalises everything around you.",
  },
  {
    step: "02",
    icon: "pregnant_woman",
    title: "Track Your Journey",
    body: "Log daily vitals, schedule ANC appointments, and track your baby's development week by week — all in one place.",
  },
  {
    step: "03",
    icon: "notifications_active",
    title: "Get Timely Reminders",
    body: "Receive device notifications for medication times, upcoming clinic visits, and vaccine due dates — so you never miss a critical step.",
  },
  {
    step: "04",
    icon: "local_pharmacy",
    title: "Access Care Nearby",
    body: "Find the nearest pharmacy using your GPS location, order prescription delivery, and book clinic appointments with backup options.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="font-body text-body-md overflow-x-hidden">
      <Navbar />

      <main className="pt-20 pb-section-gap">
        {/* ── Hero ── */}
        <section className="px-margin-mobile py-12 md:py-16 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center space-x-2 bg-surface-container-high px-4 py-2 rounded-full mb-6 text-primary border border-outline-variant">
              <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              <span className="font-body text-label-md">Your maternal health companion</span>
            </div>

            <h1 className="font-headline text-headline-lg-mobile md:text-headline-xl text-primary mb-6 leading-tight">
              Guided care for your motherhood journey, in your own language.
            </h1>

            <p className="font-body text-body-md md:text-body-lg text-on-surface-variant mb-8 max-w-xl">
              Mama Ba offers culturally respectful, localized medical guidance and a reassuring
              "Big Sister" voice to support you from pregnancy through early motherhood.
            </p>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
              <button
                onClick={() => navigate("/signin")}
                className="bg-primary text-on-primary font-headline text-button px-8 py-4 rounded-full w-full sm:w-auto shadow-md hover:bg-primary-container transition-colors active:scale-95 flex items-center justify-center space-x-2"
              >
                <span className="material-symbols-outlined">login</span>
                <span>Sign In</span>
              </button>

              <button
                onClick={() => navigate("/signin")}
                aria-label="Ask with your voice"
                className="border-2 border-primary text-primary font-headline text-button px-8 py-4 rounded-full w-full sm:w-auto hover:bg-surface-container-high transition-colors active:scale-95 flex items-center justify-center space-x-2"
              >
                <span className="material-symbols-outlined">mic</span>
                <span>Talk to Mama Ba</span>
              </button>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-outline-variant">
            <img
              src="https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcQqmafKYUO3PMJVE_UvJxW4CRI4EArwV0eTGbvqSY-WJrh8iJkYqXXHNtKs_fQEsiCVxi0WyrQZc_xhRBY"
              alt="Mother smiling with newborn baby"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-margin-mobile grid grid-cols-1 md:grid-cols-3 gap-gutter-md max-w-[1200px] mx-auto py-section-gap">
          {features.map((f) => (
            <div key={f.title} className="bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col gap-4 hover:bg-surface-container transition-colors duration-300 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h2 className="font-headline text-headline-md text-charcoal-green">{f.title}</h2>
              <p className="text-on-surface-variant">{f.body}</p>
            </div>
          ))}
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="px-margin-mobile py-section-gap bg-surface-container-low border-y border-outline-variant">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-headline text-headline-lg-mobile md:text-headline-xl text-primary mb-4">
                How Mama Ba Works
              </h2>
              <p className="text-on-surface-variant">
                From sign-up to your first reminder, you're guided every step of the way — in Twi or English.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.step} className="relative flex flex-col items-center text-center gap-4 p-6 bg-background rounded-2xl border border-outline-variant shadow-sm">
                  <span className="absolute top-4 right-4 text-xs font-bold text-primary/30 font-headline">{s.step}</span>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px] text-primary">{s.icon}</span>
                  </div>
                  <h3 className="font-headline text-headline-md text-on-surface">{s.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Twi Voice Section ── */}
        <section id="twi-voice" className="px-margin-mobile py-section-gap bg-forest-green text-on-primary relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-start gap-6">
              <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg">
                Talk to your Big Sister, in Twi
              </h2>
              <p className="text-white/90">
                Tap the mic and ask your question out loud — no typing, no translating.
                Sign in to unlock full voice conversations with Mama Ba.
              </p>
              <button
                onClick={() => navigate("/signin")}
                className="inline-flex items-center space-x-3 bg-white text-forest-green font-headline px-8 py-4 rounded-full shadow-md hover:bg-white/90 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-2xl">mic</span>
                <span>Try Twi Voice Assistant</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-xl max-h-[320px]">
              <img
                src="https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcT8uQ5Oppn5fJAbJl237FHLvZhizHnwd3fnsBciiRfp530uFRfsHO6DqhncDeHowmRMVQSLyZfsxgtDiEE"
                alt="Mother interacting on mobile device"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* ── Safety & Medical Section ── */}
        <section id="safety" className="px-margin-mobile py-section-gap max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-md aspect-[16/10]">
            <img
              src="https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcR6BEJjU8JN2Qmxg4ImYHmyTz1hJfSBrzOv9UNhJtDyljtjrLQsMSlilSH8K_EOoy1H5kFuzBOlajX_62w"
              alt="Pregnant woman receiving medical checkup at clinic"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-start">
            <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary mb-4">
              Safe Motherhood, Traditional Wisdom
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Check a herbal remedy before you use it. Mama Ba blends clinically backed guidance
              with respect for traditional Ghanaian practice, so you can make informed choices
              throughout your care.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-section-gap bg-surface-container-high border-t border-outline-variant">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-md px-margin-mobile md:px-gutter-md max-w-[1440px] mx-auto">
          <div className="flex flex-col space-y-4">
            <div className="font-headline text-headline-md font-bold text-primary">Mama Ba</div>
            <p className="font-body text-label-md text-on-surface-variant max-w-sm">
              Empowering Ghanaian mothers with culturally respectful health guidance, from pregnancy through early motherhood.
            </p>
            <p className="text-xs text-on-surface-variant">© 2026 Mama Ba. All rights reserved.</p>
          </div>
          <div className="flex flex-col space-y-3 md:items-end">
            <Link to="/privacy-policy" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/health-disclaimer" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Health Disclaimer</Link>
            <Link to="/contact" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}