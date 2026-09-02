import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    // Replace with your API call or Firebase/Django auth logic
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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
          <label className="text-xs font-semibold text-on-surface-variant block mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-on-surface-variant block mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-on-surface-variant block mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors mt-2"
        >
          <Lock className="w-5 h-5" />
          <span>Update Password</span>
        </button>
      </form>
    </div>
  );
}