import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: sbErr } = await supabase.auth.updateUser({ password: newPassword });
      if (sbErr) throw sbErr;
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not update password. You may need to sign in again first.");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="font-headline text-headline-sm text-on-surface">Change Password</h1>
      </header>

      {success && (
        <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-4 flex items-center gap-3 text-forest-green">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Your password has been updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="bg-error-container/40 border border-error/30 rounded-2xl p-4 text-sm text-error font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-on-surface-variant block mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 pr-10 text-sm text-on-surface focus:outline-none focus:border-primary"
              required
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
          <label className="text-xs font-semibold text-on-surface-variant block mb-1">
            Confirm New Password
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors mt-2 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
          ) : (
            <><Lock className="w-5 h-5" /> Update Password</>
          )}
        </button>
      </form>
    </div>
  );
}