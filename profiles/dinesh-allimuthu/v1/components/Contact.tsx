import { motion } from "motion/react";
import { useState } from "react";
import { EmailText } from "#kit";

import { LampContainer } from "../ui/lamp";

const CONTACT_EMAIL = "dineshallimuthupro@outlook.com";

const contact = {
  email: CONTACT_EMAIL,
  linkedin: "https://linkedin.com/in/dinesha07",
  github: "https://github.com/dinesh-ad",
};

const timezones = [
  "IST (Mumbai, India)",
  "CET (Paris, France)",
  "GMT (London, UK)",
  "EST (New York, US)",
  "PST (Los Angeles, US)",
  "JST (Tokyo, Japan)",
];

export function Contact() {
  const [showCallForm, setShowCallForm] = useState(false);
  const [callForm, setCallForm] = useState({
    name: "",
    email: "",
    reason: "",
    timezone: timezones[0],
  });
  const [submitted, setSubmitted] = useState(false);

  const handleCallRequest = () => {
    const subject = encodeURIComponent(`Phone Call Request from ${callForm.name}`);
    const body = encodeURIComponent(
      [
        "Hi Dinesh,",
        "",
        "I'd like to schedule a phone call with you.",
        "",
        `Name: ${callForm.name}`,
        `Email: ${callForm.email}`,
        `Reason: ${callForm.reason}`,
        `Preferred timezone: ${callForm.timezone}`,
        "",
        "Looking forward to connecting!",
      ].join("\n")
    );
    window.open(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
    setSubmitted(true);
  };

  return (
    <section id="contact">
      {/* Lamp Effect - second usage: dramatic CTA section */}
      <LampContainer className="min-h-[auto] pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 bg-linear-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
            Let's Connect
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">
            Open to collaborations, consulting, or conversations about data science, ML, and AI.
          </p>
        </motion.div>
      </LampContainer>

      {/* Contact cards - on white background */}
      <div className="bg-slate-50/80 border-t border-slate-200 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6 mb-10 min-w-0">
            <a
              href={`mailto:${contact.email}`}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <div className="w-12 h-12 bg-(--color-primary) rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                ✉️
              </div>
              <h3 className="font-display font-semibold text-slate-900 mb-1">Email</h3>
              <p className="text-(--color-primary) text-sm">
                <EmailText email={contact.email} />
              </p>
            </a>

            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <div className="w-12 h-12 bg-(--color-accent) rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                💼
              </div>
              <h3 className="font-display font-semibold text-slate-900 mb-1">LinkedIn</h3>
              <p className="text-(--color-primary) text-sm">Connect</p>
            </a>

            <a
              href={contact.github}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <div className="w-12 h-12 bg-(--color-secondary) rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🔗
              </div>
              <h3 className="font-display font-semibold text-slate-900 mb-1">GitHub</h3>
              <p className="text-(--color-primary) text-sm">dinesh-ad</p>
            </a>
          </div>

          {/* Secure phone request */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs max-w-2xl mx-auto mb-10">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-linear-to-br from-(--color-primary) to-(--color-secondary) rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">
                📞
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-1">Request a Call</h3>
              <p className="text-sm text-slate-500">
                My phone number is not listed publicly. Submit a request and I'll share it directly
                via email.
              </p>
            </div>

            {!showCallForm && !submitted && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowCallForm(true)}
                  className="px-6 py-3 bg-(--color-primary) text-white rounded-xl hover:bg-(--color-primary-hover) transition-all font-display font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  I'd Like to Schedule a Call
                </button>
              </div>
            )}

            {showCallForm && !submitted && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="call-name"
                    className="block text-sm font-semibold text-slate-700 mb-1"
                  >
                    Your name
                  </label>
                  <input
                    id="call-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={callForm.name}
                    onChange={(e) => setCallForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="call-email"
                    className="block text-sm font-semibold text-slate-700 mb-1"
                  >
                    Your email
                  </label>
                  <input
                    id="call-email"
                    type="email"
                    placeholder="jane@company.com"
                    value={callForm.email}
                    onChange={(e) => setCallForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="call-reason"
                    className="block text-sm font-semibold text-slate-700 mb-1"
                  >
                    Reason for call
                  </label>
                  <textarea
                    id="call-reason"
                    rows={3}
                    placeholder="e.g. Discuss a consulting opportunity on NLP..."
                    value={callForm.reason}
                    onChange={(e) => setCallForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 resize-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="call-tz"
                    className="block text-sm font-semibold text-slate-700 mb-1"
                  >
                    Preferred timezone
                  </label>
                  <select
                    id="call-tz"
                    value={callForm.timezone}
                    onChange={(e) => setCallForm((f) => ({ ...f, timezone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary)/20 outline-none transition-all text-slate-900 bg-white"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCallRequest}
                    disabled={!callForm.name || !callForm.email || !callForm.reason}
                    className="flex-1 px-6 py-3 bg-(--color-primary) text-white rounded-xl hover:bg-(--color-primary-hover) transition-all font-display font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Send Request via Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCallForm(false)}
                    className="px-4 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-display font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {submitted && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-slate-700 font-semibold">Request sent!</p>
                <p className="text-sm text-slate-500 mt-1">
                  Check your email client - a pre-filled message was opened for you.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setShowCallForm(false);
                    setCallForm({
                      name: "",
                      email: "",
                      reason: "",
                      timezone: timezones[0],
                    });
                  }}
                  className="mt-4 text-sm text-(--color-primary) hover:underline"
                >
                  Send another request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-slate-50/80 pb-8 pt-4 border-t border-slate-200">
        <p className="text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} Dinesh Allimuthu. All rights reserved.
        </p>
      </footer>
    </section>
  );
}
