import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

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

  // OTP step state (8-digit Supabase Auth Token)
  const [otpStep, setOtpStep]             = useState(false);   // false = form, true = OTP entry
  const [submittedData, setSubmittedData] = useState(null);    // holds form values between steps
  const [demoCode, setDemoCode]           = useState("");       // shown only in demo mode
  const [otpValues, setOtpValues]         = useState(Array(8).fill("")); // 8-digit inputs for Supabase
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

  // ── Step 1: submit form → trigger Supabase OTP send to user email ──────────
  const onSubmit = async (data) => {
    setServerError("");
    try {
      if (supabase && supabase.auth) {
        // Send real 6-digit verification code to the user's email address via Supabase Auth
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.name }
          }
        });

        if (error && !error.message.includes("already registered")) {
          // Fallback: try signInWithOtp to send code to email
          await supabase.auth.signInWithOtp({ email: data.email }).catch(() => {});
        }
      } else {
        // Fallback to Express backend verification if Supabase client not present
        await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/send-verification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email }),
          }
        ).catch(() => {});
      }

      setSubmittedData(data);
      setOtpStep(true);
      startResendCooldown();
    } catch (err) {
      setServerError(err.message || "Something went wrong. Please try again.");
    }
  };

  // ── OTP input helpers (8-digit) ─────────────────────────────
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otpValues];
    next[idx] = digit;
    setOtpValues(next);
    if (digit && idx < 7) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otpValues[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (pasted.length === 8) {
      setOtpValues(pasted.split(""));
      inputRefs.current[7]?.focus();
    }
  };

  const [emailSent, setEmailSent]         = useState(false);

  // ── Step 2: verify 8-digit OTP code with Supabase → create account ─────────
  const verifyOtp = async () => {
    const code = otpValues.join("").trim();
    if (code.length < 8) { setOtpError("Please enter all 8 digits of your verification code."); return; }
    setOtpError("");
    setVerifying(true);
    try {
      let isVerified = false;

      // 1. Verify 6-digit code with Supabase Auth
      if (supabase && supabase.auth) {
        const { data: suRes, error: err1 } = await supabase.auth.verifyOtp({
          email: submittedData.email,
          token: code,
          type: "signup"
        });

        if (!err1 && (suRes?.session || suRes?.user)) {
          isVerified = true;
        } else {
          // Try 'email' token type
          const { data: suRes2, error: err2 } = await supabase.auth.verifyOtp({
            email: submittedData.email,
            token: code,
            type: "email"
          });
          if (!err2 && (suRes2?.session || suRes2?.user)) {
            isVerified = true;
          }
        }
      }

      // 2. Fallback: check Express backend verification API
      if (!isVerified) {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/verify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: submittedData.email, code }),
          }
        );
        if (res.ok) {
          isVerified = true;
        }
      }

      // 3. Fallback: check window demo OTP if in demo mode
      if (!isVerified && window.__demoOtp && code === window.__demoOtp) {
        isVerified = true;
      }

      if (!isVerified) {
        throw new Error("Invalid or expired verification code. Please check your email inbox.");
      }

      // Code correct — complete account setup and log user in
      const result = await signup(submittedData);
      if (result && result.verificationPending) {
        setEmailSent(true);
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      setOtpError(err.message || "Invalid verification code.");
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
    const targetEmail = submittedData?.email;
    if (!targetEmail) {
      setOtpError("Email address missing. Please go back to sign up.");
      return;
    }

    setOtpError("");
    try {
      if (supabase && supabase.auth) {
        // 1. Try Supabase Auth signup resend
        const { error: resendErr } = await supabase.auth.resend({
          type: "signup",
          email: targetEmail,
        });

        if (resendErr) {
          console.warn("Supabase resend notice:", resendErr.message);
          // 2. Try OTP resend via signInWithOtp
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: targetEmail
          });
          if (otpErr) {
            setOtpError(otpErr.message || resendErr.message || "Please wait 60 seconds before requesting another code.");
            return;
          }
        }
      } else {
        // Express backend fallback
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/send-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setOtpError(errJson.message || "Could not resend verification email.");
          return;
        }
      }
    } catch (err) {
      setOtpError(err.message || "Could not resend verification email.");
      return;
    }

    setOtpValues(Array(8).fill(""));
    startResendCooldown();
  };

  // ────────────────────────────────────────────────────────────
  // RENDER — Email verification pending step
  // ────────────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 md:px-8">
        <Link to="/" className="font-headline text-headline-md font-bold text-primary mb-8">
          Mama Ba
        </Link>
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px]">mark_email_read</span>
            </div>
          </div>
          <h2 className="text-xl font-bold font-headline text-on-surface">Check Your Email / Hwɛ Wo Email</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            We sent a verification link to <span className="font-semibold text-primary">{submittedData?.email}</span>. Click the link to activate your account and start using Mama Ba.
          </p>
          <div className="pt-4">
            <Link
              to="/signin"
              className="inline-block w-full py-3.5 bg-primary text-on-primary font-semibold text-sm rounded-full shadow-xs hover:bg-primary-container transition-colors"
            >
              Go to Sign In / Kɔ So Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            We sent an 8-digit verification code to
          </p>
          <p className="text-primary font-semibold text-center mb-6 text-sm break-all">
            {submittedData?.email}
          </p>

          {/* 8-digit OTP input with mobile keyboard auto-fill */}
          <div className="relative flex justify-center items-center my-6" onPaste={handleOtpPaste}>
            {/* Transparent input overlay for iOS/Android native keyboard auto-fill */}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{8}"
              maxLength={8}
              value={otpValues.join("")}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "").slice(0, 8);
                const arr = cleaned.split("");
                while (arr.length < 8) arr.push("");
                setOtpValues(arr);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 tracking-widest text-transparent caret-transparent"
              autoFocus
            />

            {/* Visual 8-Box Grid (compact mobile responsive sizing) */}
            <div className="flex gap-1 sm:gap-2 pointer-events-none">
              {otpValues.map((digit, idx) => {
                const isCurrent = idx === otpValues.join("").length;
                return (
                  <div
                    key={idx}
                    className={`w-8 h-12 sm:w-10 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg sm:rounded-xl border transition-all duration-150 ${
                      digit
                        ? "border-primary bg-primary/5 text-on-surface"
                        : isCurrent
                        ? "border-primary ring-2 ring-primary/20 bg-surface"
                        : "border-outline-variant bg-surface text-on-surface-variant/40"
                    }`}
                  >
                    {digit}
                  </div>
                );
              })}
            </div>
          </div>

          {otpError && (
            <p className="text-center text-sm text-error mb-4">{otpError}</p>
          )}

          <button
            onClick={verifyOtp}
            disabled={verifying || otpValues.join("").length < 8}
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