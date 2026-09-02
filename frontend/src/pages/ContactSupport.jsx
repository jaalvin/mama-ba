import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare } from "lucide-react";
import Navbar from "../components/Navbar.jsx";

export default function ContactSupport() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background font-body text-body-md">
      <Navbar />

      <main className="pt-24 pb-16 px-4 md:px-6 max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-on-surface" />
          </button>
          <div>
            <h1 className="font-headline text-headline-md md:text-headline-lg text-primary font-bold">
              Contact &amp; Support
            </h1>
            <p className="text-xs text-on-surface-variant">We're here to help you navigate your motherhood journey</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-on-surface">Email Us</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">Questions, feedback, or partnerships:</p>
            <a href="mailto:support@mamaba.health" className="text-xs font-semibold text-primary hover:underline mt-auto">
              support@mamaba.health
            </a>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-forest-green/10 flex items-center justify-center text-forest-green">
              <Phone className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-on-surface">Helpline</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">Mon - Fri, 8:00 AM - 5:00 PM GMT:</p>
            <a href="tel:+233302000000" className="text-xs font-semibold text-forest-green hover:underline mt-auto">
              +233 (0) 30 200 0000
            </a>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-earthen-ochre/10 flex items-center justify-center text-earthen-ochre">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-on-surface">Location</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">Accra &amp; Kumasi Hubs:</p>
            <span className="text-xs font-semibold text-on-surface mt-auto">
              Ghana, West Africa
            </span>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h2 className="font-headline text-headline-sm text-on-surface mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Send Us a Message</span>
          </h2>
          <p className="text-xs text-on-surface-variant mb-6">
            Fill out the form below and our team will get back to you within 24 hours.
          </p>

          {submitted ? (
            <div className="bg-forest-green/10 border border-forest-green/30 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-forest-green" />
              <h3 className="font-headline text-headline-md text-forest-green">Message Sent Successfully!</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                Thank you for reaching out. A Mama Ba support representative will review your message and reply soon.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className="mt-2 text-xs font-semibold text-primary underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abena Mensah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Email or Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. abena@example.com or +233..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Inquiry Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="general">General Inquiry</option>
                  <option value="app_feedback">App Feedback &amp; Features</option>
                  <option value="clinic_partner">Clinic / Midwife Partnership</option>
                  <option value="voice_assistant">Twi Voice Assistant Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Your Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help you today?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary text-on-surface text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto self-end bg-primary text-on-primary font-semibold px-8 py-3.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
