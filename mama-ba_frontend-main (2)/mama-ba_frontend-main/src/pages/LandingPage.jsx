import { useNavigate } from "react-router-dom";
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

const testimonials = [
  {
    quote: "The pregnancy tracker explained exactly what my body was going through. No confusing medical words, just clear advice.",
    name: "Yaa",
    place: "Accra",
    avatar: "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcQkqDv8grw3twlfK178U0PZ4t_ppOiP-0r7HjNsjDucTTyOoMxc-xIFRqCTKO2YQWhhUBEgK18OPRZhGr8",
  },
  {
    quote: "I use the Twi voice feature every day. It's so much easier than trying to read long articles when I'm tired.",
    name: "Fatima",
    place: "Tamale",
    avatar: "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcT8uQ5Oppn5fJAbJl237FHLvZhizHnwd3fnsBciiRfp530uFRfsHO6DqhncDeHowmRMVQSLyZfsxgtDiEE",
  },
  {
    quote: "My local clinic recommended this app to remind me of my appointments. It really helps me stay on track.",
    name: "Esi",
    place: "Cape Coast",
    avatar: "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcQqmafKYUO3PMJVE_UvJxW4CRI4EArwV0eTGbvqSY-WJrh8iJkYqXXHNtKs_fQEsiCVxi0WyrQZc_xhRBY",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="font-body text-body-md overflow-x-hidden">
      <Navbar />

      <main className="pt-20 pb-section-gap">
        {/* Hero Section */}
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
                className="border-2 border-clay-red text-clay-red font-headline text-button px-8 py-4 rounded-full w-full sm:w-auto hover:bg-surface-container-high transition-colors active:scale-95 flex items-center justify-center space-x-2"
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

        {/* Features Section */}
        <section id="features" className="px-margin-mobile grid grid-cols-1 md:grid-cols-3 gap-gutter-md max-w-[1200px] mx-auto py-section-gap">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-surface-container-low border border-outline-variant rounded-xl p-8 flex flex-col gap-4 hover:bg-surface-container transition-colors duration-300 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h2 className="font-headline text-headline-md text-charcoal-green">{f.title}</h2>
              <p className="text-on-surface-variant">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Voice Section */}
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

        {/* Safety & Medical Section */}
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

        {/* Testimonials */}
        <section id="testimonials" className="px-margin-mobile py-section-gap max-w-[1200px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-headline text-headline-lg-mobile md:text-headline-xl text-charcoal-green mb-4">
              Stories from Our Community
            </h2>
            <p className="text-on-surface-variant">
              Hear from mothers across Ghana who have found comfort and guidance with their digital Big Sister.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-md">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col justify-between">
                <p className="text-on-surface mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center space-x-3">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-outline-variant" />
                  <div>
                    <p className="font-headline text-label-md text-charcoal-green font-semibold">{t.name}</p>
                    <p className="text-sm text-on-surface-variant">{t.place}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-section-gap bg-surface-container-high border-t border-outline-variant">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-md px-margin-mobile md:px-gutter-md max-w-[1440px] mx-auto">
          <div className="flex flex-col space-y-6">
            <div className="font-headline text-headline-md font-bold text-primary">Mama Ba</div>
            <p className="font-body text-label-md text-on-surface-variant">
              © 2026 Mama Ba. Empowering Ghanaian Motherhood. Medical Disclaimer: This app
              provides general health information and is not a substitute for professional
              medical advice, diagnosis, or treatment.
            </p>
          </div>
          <div className="flex flex-col space-y-4 md:items-end">
            <a href="#" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Health Disclaimer</a>
            <a href="#" className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}