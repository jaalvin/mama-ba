import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { emergencyContacts as contactsAPI } from "../services/api.js";
import { ArrowLeft, Phone, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";

export default function EmergencyContacts() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [relation, setRelation] = useState("");

  // Load contacts on mount
  useEffect(() => {
    if (!accessToken) return;
    contactsAPI.list(accessToken)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      const item = await contactsAPI.create(accessToken, {
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || "Personal",
      });
      setContacts((prev) => [...prev, item]);
      setName(""); setPhone(""); setRelation("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await contactsAPI.remove(accessToken, id);
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
          In case of severe maternal warning signs or immediate medical emergencies, contact your nearest emergency unit immediately.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Saved Contacts</h2>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && contacts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl">
            <Phone className="w-8 h-8 opacity-30" />
            <p className="text-sm">No contacts saved yet</p>
            <p className="text-xs opacity-70">Add your midwife, partner, or emergency services below</p>
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div className="flex flex-col gap-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-primary-container/40 text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface">{contact.name}</h3>
                    <p className="text-xs text-on-surface-variant">{contact.phone} • {contact.relation}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  className="p-2 text-outline hover:text-error transition-colors rounded-full hover:bg-error/10"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Contact Form */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 flex flex-col gap-4">
        <h2 className="text-label-md text-on-surface">Add Personal Emergency Contact</h2>
        <form onSubmit={handleAddContact} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Contact Name (e.g. Midwife / Partner)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
            required
          />
          <input
            type="text"
            placeholder="Relationship / Role"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span>{saving ? "Saving..." : "Add Contact"}</span>
          </button>
        </form>
      </section>
    </div>
  );
}