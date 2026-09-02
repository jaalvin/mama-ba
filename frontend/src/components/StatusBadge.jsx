import React from "react";

export function StatusBadge({ status, safetyStatus, source }) {
  const activeStatus = (status || safetyStatus || "CAUTION").toUpperCase();

  const styles = {
    SAFE: "bg-emerald-100 text-emerald-800 border-emerald-300",
    CAUTION: "bg-amber-100 text-amber-800 border-amber-300",
    AVOID: "bg-rose-100 text-rose-800 border-rose-300",
    DANGER: "bg-rose-100 text-rose-800 border-rose-300",
    UNKNOWN: "bg-stone-100 text-stone-700 border-stone-300"
  };

  const labels = {
    SAFE: "Safe / Ɛyɛ",
    CAUTION: "Caution / Twɛn Kakra",
    AVOID: "Avoid / Mfa Nni Dwuma",
    DANGER: "Danger / Mfa Nni Dwuma",
    UNKNOWN: "Unknown / Nsɛm Nni Hɔ"
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${styles[activeStatus] || styles.UNKNOWN}`}>
        {labels[activeStatus] || activeStatus}
      </span>
      {source && (
        <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
          {source.replace("_", " ")}
        </span>
      )}
    </div>
  );
}
