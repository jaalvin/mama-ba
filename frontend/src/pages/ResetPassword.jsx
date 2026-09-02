import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the user back here with a fragment token after email click.
  // The PASSWORD_RECOVERY event fires when the token is valid.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if there's already an active session (user may have opened in same tab)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: sbErr } = await supabase.auth.updateUser({ password });
      if (sbErr) throw sbErr;
      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      setError(err.message || "Could not update password. Please request a new reset link.");
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
        {success ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-forest-green/10 border border-forest-green/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-forest-green" />
            </div>
            <h1 className="font-headline text-headline-md text-on-surface">Password Updated!</h1>
            <p className="text-sm text-on-surface-variant">
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="flex flex-col items-center gap-4 text-center py-8 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Verifying your reset link…</p>
            <p className="text-xs text-on-surface-variant/70 max-w-xs">
              If this screen doesn't change, the link may have expired. Please{" "}
              <Link to="/forgot-password" className="text-primary hover:underline font-semibold">
                request a new one
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-headline text-headline-md text-charcoal-green mb-2">
              Set New Password
            </h1>
            <p className="text-on-surface-variant text-sm mb-6">
              Enter your new password below.
            </p>

            {error && (
              <div className="mb-4 bg-error-container text-on-error-container text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-pw" className="block text-sm font-medium text-on-surface mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    id="new-pw"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-10 pr-10 rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-pw" className="block text-sm font-medium text-on-surface mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    id="confirm-pw"
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 pl-10 rounded-xl border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                ) : (
                  <><Lock className="w-4 h-4" /> Update Password</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
