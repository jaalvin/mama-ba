import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { User, PhoneCall, ShieldAlert, Lock, KeyRound, LogOut, ChevronRight } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-8">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
          <User className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-headline text-headline-lg text-primary">
          {user?.name || "Your account"}
        </h1>
        <p className="text-on-surface-variant text-sm">{user?.email}</p>
      </section>

      {/* Support & Safety Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1">
          Support &amp; Safety
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <Link
            to="emergency-contacts"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface">Emergency Contacts</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <Link
            to="health-disclaimer"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface">Health Disclaimer</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Account Section */}
      <section>
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2 px-1">
          Account
        </h2>
        <div className="flex flex-col divide-y divide-outline-variant bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <Link
            to="privacy-data"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface">Privacy &amp; Data</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <Link
            to="change-password"
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className="text-on-surface">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" strokeWidth={1.5} />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-between px-4 py-4 text-left hover:bg-error-container/40 transition-colors w-full"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-error" strokeWidth={1.5} />
              <span className="text-error font-medium">Sign Out</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}