import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: sbErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (sbErr) throw sbErr;
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send reset email. Please check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 md:px-8">
      <Link to="/" className="font-headline text-headline-md font-bold text-primary mb-8">
        Mama Ba
      </Link>

      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-forest-green/10 border border-forest-green/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-forest-green" />
            </div>
            <h1 className="font-headline text-headline-md text-on-surface">Check Your Email</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
              We sent a password reset link to <strong className="text-on-surface">{email}</strong>.
              Click the link in the email to set a new password.
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Didn't receive it? Check your spam folder, or{" "}
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-primary font-semibold hover:underline"
              >
                try again
              </button>
              .
            </p>
            <button
              onClick={() => navigate("/signin")}
              className="mt-4 w-full bg-primary text-on-primary font-semibold py-3 rounded-xl text-sm"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-headline text-headline-md text-charcoal-green mb-2">
              Forgot Password?
            </h1>
            <p className="text-on-surface-variant text-sm mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-4 bg-error-container text-on-error-container text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="fp-email" className="block text-label-md text-on-surface mb-2 text-sm font-medium">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    id="fp-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-10 rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
