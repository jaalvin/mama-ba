import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";

const passwordRules = [
  { label: "At least 8 characters",    test: (v) => v.length >= 8 },
  { label: "One uppercase letter",      test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter",      test: (v) => /[a-z]/.test(v) },
  { label: "One number",               test: (v) => /\d/.test(v) },
  { label: "One special character",    test: (v) => /[^A-Za-z0-9]/.test(v) },
];

// Generate a random 6-digit code
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [serverError, setServerError]     = useState("");

  // OTP step state
  const [otpStep, setOtpStep]             = useState(false);   // false = form, true = OTP entry
  const [submittedData, setSubmittedData] = useState(null);    // holds form values between steps
  const [demoCode, setDemoCode]           = useState("");       // shown only in demo mode
  const [otpValues, setOtpValues]         = useState(Array(6).fill("")); // individual digit inputs
  const [otpError, setOtpError]           = useState("");
  const [verifying, setVerifying]         = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onBlur" });

  const password = watch("password", "");

  // ── Step 1: submit form → trigger OTP send ──────────────────
  const onSubmit = async (data) => {
    setServerError("");
    try {
      if (DEMO_MODE) {
        // In demo mode, generate a fake code and display it on screen
        const code = genCode();
        setDemoCode(code);
        // Store the mock code on the window so the verify step can check it
        window.__demoOtp = code;
      } else {
        // Real mode: hit the backend to send the email code
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api"}/auth/send-verification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Could not send verification email.");
        }
      }
      setSubmittedData(data);
      setOtpStep(true);
      startResendCooldown();
    } catch (err) {
      setServerError(err.message || "Something went wrong. Please try again.");
    }
  };

  // ── OTP input helpers ────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otpValues];
    next[idx] = digit;
    setOtpValues(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otpValues[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpValues(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  // ── Step 2: verify OTP → create account ─────────────────────
  const verifyOtp = async () => {
    const code = otpValues.join("");
    if (code.length < 6) { setOtpError("Please enter all 6 digits."); return; }
    setOtpError("");
    setVerifying(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 500));
        if (code !== window.__demoOtp) throw new Error("Incorrect code. Please try again.");
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api"}/auth/verify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: submittedData.email, code }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Incorrect code. Please try again.");
        }
      }
      // Code correct — create the account
      await signup(submittedData);
      navigate("/onboarding");
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ── Resend cooldown ─────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => {
      setResendCooldown((s) => { if (s <= 1) { clearInterval(iv); return 0; } return s - 1; });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    if (DEMO_MODE) {
      const code = genCode();
      setDemoCode(code);
      window.__demoOtp = code;
    } else {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedData.email }),
      });
    }
    setOtpValues(Array(6).fill(""));
    setOtpError("");
    startResendCooldown();
  };

  // ────────────────────────────────────────────────────────────
  // RENDER — OTP step
  // ────────────────────────────────────────────────────────────
  if (otpStep) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 md:px-8">
        <Link to="/" className="font-headline text-headline-md font-bold text-primary mb-8">
          Mama Ba
        </Link>

        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px]">mark_email_read</span>
            </div>
          </div>

          <h1 className="font-headline text-headline-md text-on-surface mb-2 text-center">
            Check your email
          </h1>
          <p className="text-on-surface-variant text-center mb-2 text-sm">
            We sent a 6-digit code to
          </p>
          <p className="text-primary font-semibold text-center mb-6 text-sm break-all">
            {submittedData?.email}
          </p>

          {/* Demo mode hint */}
          {DEMO_MODE && demoCode && (
            <div className="mb-5 bg-earthen-ochre/10 border border-earthen-ochre/30 rounded-xl p-3 text-center">
              <p className="text-xs text-earthen-ochre font-semibold mb-1">🧪 Demo Mode — your code is:</p>
              <p className="font-headline text-headline-lg text-earthen-ochre tracking-widest">{demoCode}</p>
            </div>
          )}

          {/* 6-digit OTP input */}
          <div className="flex justify-center gap-2 mb-5" onPaste={handleOtpPaste}>
            {otpValues.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  otpError ? "border-error" : digit ? "border-primary" : "border-outline-variant"
                }`}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-center text-sm text-error mb-4">{otpError}</p>
          )}

          <button
            onClick={verifyOtp}
            disabled={verifying || otpValues.join("").length < 6}
            className="w-full bg-primary text-on-primary font-headline text-button py-4 rounded-full shadow-md active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {verifying ? "Verifying..." : "Verify Email"}
          </button>

          {/* Resend */}
          <p className="text-center text-sm text-on-surface-variant">
            Didn't receive it?{" "}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className={`font-semibold transition-colors ${
                resendCooldown > 0 ? "text-outline cursor-not-allowed" : "text-primary hover:underline"
              }`}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>

          <button
            onClick={() => { setOtpStep(false); setOtpValues(Array(6).fill("")); }}
            className="w-full mt-5 text-sm text-on-surface-variant hover:text-primary flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to sign up
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER — Sign up form
  // ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 md:px-8">
      <Link to="/" className="font-headline text-headline-md font-bold text-primary mb-8">
        Mama Ba
      </Link>

      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
        <h1 className="font-headline text-headline-md text-charcoal-green mb-2 text-center">
          Create your account
        </h1>
        <p className="text-on-surface-variant text-center mb-8 text-sm">
          Join Mama Ba to start your guided motherhood journey.
        </p>

        {serverError && (
          <div className="mb-6 bg-error-container text-on-error-container text-sm rounded-xl px-4 py-3">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Full name */}
          <div>
            <label htmlFor="name" className="block font-body text-label-md text-on-surface mb-2">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                errors.name ? "border-error" : "border-outline-variant"
              }`}
              {...register("name", {
                required: "Your name is required",
                minLength: { value: 2, message: "Name is too short" },
                maxLength: { value: 60, message: "Name is too long" },
              })}
            />
            {errors.name && <p className="mt-1 text-sm text-error">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block font-body text-label-md text-on-surface mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                errors.email ? "border-error" : "border-outline-variant"
              }`}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
              })}
            />
            {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block font-body text-label-md text-on-surface mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errors.password ? "border-error" : "border-outline-variant"
                }`}
                {...register("password", {
                  required: "Password is required",
                  validate: (v) => {
                    const failed = passwordRules.find((r) => !r.test(v));
                    return failed ? `Missing: ${failed.label.toLowerCase()}` : true;
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-error">{errors.password.message}</p>}
            {password && (
              <ul className="mt-3 space-y-1">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-2 text-sm ${passed ? "text-forest-green" : "text-on-surface-variant"}`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {passed ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="block font-body text-label-md text-on-surface mb-2">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                  errors.confirmPassword ? "border-error" : "border-outline-variant"
                }`}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (v) => v === password || "Passwords don't match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirm ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary font-headline text-button px-8 py-4 rounded-full shadow-md hover:bg-primary-container transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending code..." : "Continue"}
          </button>
        </form>

        <p className="text-center text-on-surface-variant mt-6 text-sm">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}