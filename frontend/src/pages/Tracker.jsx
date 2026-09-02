const visits = [
  { title: "ANC Visit 1", desc: "Initial registration, dating scan, and baseline labs.", status: "done" },
  { title: "ANC Visit 2", desc: "Anomaly scan, fetal heart rate check, second dose of TT.", status: "next", location: "Korle Bu Teaching Hospital", when: "Tomorrow, 09:00 AM" },
  { title: "ANC Visit 3", desc: "Glucose tolerance test and anemia screening.", status: "upcoming" },
  { title: "ANC Visit 4", desc: "Growth scan and birth preparedness discussion.", status: "upcoming" },
];

export default function Tracker() {
  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <h1 className="font-headline text-headline-md text-on-background mb-1">Antenatal Care Schedule</h1>
      <p className="text-on-surface-variant mb-6">Follow the official GHS schedule to ensure a healthy pregnancy.</p>

      <div className="flex flex-col gap-4">
        {visits.map((v) => (
          <div
            key={v.title}
            className={`rounded-xl border p-5 ${
              v.status === "next"
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-lowest border-outline-variant"
            }`}
          >
            <h3 className={`font-headline text-headline-md ${v.status === "next" ? "text-on-primary" : "text-on-background"}`}>
              {v.title}
            </h3>
            <p className={`mt-1 ${v.status === "next" ? "text-on-primary/90" : "text-on-surface-variant"}`}>{v.desc}</p>
            {v.status === "next" && (
              <div className="mt-4 bg-white/15 rounded-lg p-3">
                <p className="text-sm font-semibold">{v.location}</p>
                <p className="text-sm">{v.when}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}