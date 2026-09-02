import { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { Download, X, Share, PlusSquare, Smartphone, Check } from "lucide-react";

export default function PWAInstallPromptModal() {
  const { lang } = useLang();
  const { isAuthenticated, user } = useAuth();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [isIos, setIsIos]                     = useState(false);
  const [isStandalone, setIsStandalone]       = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Detect if running as standalone app already
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://");
    setIsStandalone(Boolean(inStandalone));

    if (inStandalone) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIos(iosDevice);

    // Save beforeinstallprompt event for Android / Chrome
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Trigger auto pop-up on login if not dismissed this session
    if (isAuthenticated) {
      const dismissed = sessionStorage.getItem("mama_ba_pwa_dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 1200); // Show popup 1.2s after login
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [isAuthenticated, user]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalledSuccess(true);
        setTimeout(() => setShowModal(false), 2000);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosInstructions(true);
    } else {
      setShowIosInstructions(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("mama_ba_pwa_dismissed", "true");
    setShowModal(false);
  };

  if (isStandalone || !showModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Custom Favicon App Logo with Glow Ring */}
        <div className="relative mt-2">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/40 to-earthen-ochre/40 blur-sm animate-pulse" />
          <img
            src="/favicon.png"
            alt="Mama Ba App Icon"
            className="relative w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-surface"
          />
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h2 className="font-headline text-headline-md text-on-surface font-bold">
            {lang === "twi" ? "Fa Mama Ba Gu Wo Phone So" : "Add Mama Ba to Home Screen"}
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed px-2">
            {lang === "twi"
              ? "Kora yɛn app no gu wo phone so na nya apomuden nkae ntɛm, nnuro berɛ, ne ayaresabea kwan berɛ a intanɛte nni hɔ mpo."
              : "Install Mama Ba as an app on your mobile device for quick offline access, medication alarms, and care tracking."}
          </p>
        </div>

        {/* Success state */}
        {installedSuccess ? (
          <div className="flex items-center gap-2 text-forest-green font-semibold text-sm bg-forest-green/10 px-4 py-2 rounded-xl">
            <Check className="w-5 h-5" />
            <span>{lang === "twi" ? "W'ahyehyɛ no yie!" : "Installed successfully!"}</span>
          </div>
        ) : showIosInstructions ? (
          /* Step-by-step instructions for iOS Safari / Unsupported Browsers */
          <div className="w-full bg-surface-container border border-outline-variant rounded-2xl p-4 text-left text-xs space-y-3">
            <p className="font-semibold text-on-surface text-center">
              {lang === "twi" ? "Kwan a Wobɛfa So Ahyehyɛ No (iOS & Safari):" : "How to Add to Home Screen:"}
            </p>
            <div className="flex items-start gap-2 text-on-surface-variant">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <span>
                {lang === "twi" ? "Tia Share foforɔ no " : "Tap the Share button "}
                <Share className="inline w-3.5 h-3.5 text-primary mx-0.5" />
                {lang === "twi" ? "wɔ wo browser mu." : "in Safari."}
              </span>
            </div>
            <div className="flex items-start gap-2 text-on-surface-variant">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <span>
                {lang === "twi" ? "Yi " : "Select "}
                <strong className="text-on-surface">
                  {lang === "twi" ? "'Fa Gu Home Screen' " : "'Add to Home Screen' "}
                </strong>
                <PlusSquare className="inline w-3.5 h-3.5 text-primary mx-0.5" />
                {lang === "twi" ? "na fa to w'ani so." : "to save Mama Ba as an app."}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full mt-2 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-xs text-center"
            >
              {lang === "twi" ? "Mawiee / Understood" : "Got it!"}
            </button>
          </div>
        ) : (
          /* Main Install Buttons */
          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-full bg-primary text-on-primary font-headline font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {lang === "twi" ? "Fa Gu Phone So (Install Web App)" : "Set Web App on Mobile Device"}
              </span>
            </button>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-full border border-outline-variant text-on-surface-variant font-semibold text-xs hover:bg-surface-container transition-colors"
            >
              {lang === "twi" ? "Akyire (Maybe Later)" : "Maybe Later"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
