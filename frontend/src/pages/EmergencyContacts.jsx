import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Plus, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const DEFAULT_CONTACTS = [
  { id: 1, name: "National Emergency Service", phone: "112", relation: "Hotline" },
  { id: 2, name: "KNUST Hospital Triage", phone: "+233 32 206 0298", relation: "Facility" },
];

export default function EmergencyContacts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState(() => {
    const raw = localStorage.getItem("mama_ba_emergency_contacts");
    return raw ? JSON.parse(raw) : DEFAULT_CONTACTS;
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");

  useEffect(() => {
    localStorage.setItem("mama_ba_emergency_contacts", JSON.stringify(contacts));
  }, [contacts]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    const newContact = { id: Date.now(), name, phone, relation: relation || "Personal" };
    const updated = [...contacts, newContact];
    setContacts(updated);

    // Save persistently to SQLite database on backend
    try {
      await api.saveProfile({
        userId: user?.email || "demo-patient-001",
        emergencyContact: `${name} (${relation || "Personal"}): ${phone}`
      });
    } catch { /* fallback to local persistence */ }

    setName("");
    setPhone("");
    setRelation("");
  };

  const handleDelete = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
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
        <h1 className="font-headline text-headline-sm text-on-surface">Emergency Contacts</h1>
      </header>

      <div className="bg-error-container/30 border border-error/20 rounded-2xl p-4 flex gap-3 items-start">
        <AlertCircle className="w-6 h-6 text-error shrink-0 mt-0.5" />
        <p className="text-xs text-on-surface leading-relaxed">
          In case of severe maternal warning signs or immediate medical emergencies, contact your nearest emergency unit immediately. All saved contacts are stored persistently.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Saved Contacts</h2>
        <div className="flex flex-col gap-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-on-surface">{c.name}</span>
                <span className="text-xs text-on-surface-variant">{c.relation} · {c.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${c.phone}`}
                  className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  aria-label={`Call ${c.name}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
                {c.id > 2 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-2.5 rounded-full hover:bg-error-container/40 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={handleAddContact} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-label-md text-on-surface font-semibold">Add New Emergency Contact</h3>
        <input
          type="text"
          placeholder="Contact Name (e.g. Midwife Abena)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none"
        />
        <input
          type="tel"
          placeholder="Phone Number (e.g. +233 24 000 0000)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none"
        />
        <input
          type="text"
          placeholder="Relationship (e.g. Husband, Sister, Clinic)"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="h-12 px-4 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none"
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-95 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Save Emergency Contact
        </button>
      </form>
    </div>
  );
}