"use client";

import { useState } from "react";
import {
  Share2,
  QrCode,
  CheckCircle2,
  ChevronDown,
  Mail,
  Clock,
  Shield,
  X,
} from "lucide-react";
import PortalHeader from "@/components/wellness/PortalHeader";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

type ProviderType = "practitioner" | "naturopath";
type ExpiryDuration = "24h" | "48h" | "7d" | "30d";
type ShareStatus = "active" | "expired" | "revoked";

interface ShareFormData {
  email: string;
  providerType: ProviderType;
  expiry: ExpiryDuration;
}

interface ShareRecord {
  id: string;
  email: string;
  providerType: ProviderType;
  scope: string;
  expiry: string;
  status: ShareStatus;
  createdAt: string;
}

/* ────────────────────────────────────────────
   Validation (Zod-style inline)
   ──────────────────────────────────────────── */

interface FormErrors {
  email?: string;
}

function validate(data: ShareFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }
  return errors;
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const EXPIRY_LABELS: Record<ExpiryDuration, string> = {
  "24h": "24 hours",
  "48h": "48 hours",
  "7d": "7 days",
  "30d": "30 days",
};

const PROVIDER_LABELS: Record<ProviderType, string> = {
  practitioner: "Practitioner",
  naturopath: "Naturopath",
};

const statusStyles: Record<ShareStatus, string> = {
  active: "bg-green-500/20 text-green-400",
  expired: "bg-yellow-500/20 text-yellow-400",
  revoked: "bg-red-500/20 text-red-400",
};

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function SharePage() {
  const [form, setForm] = useState<ShareFormData>({
    email: "",
    providerType: "practitioner",
    expiry: "24h",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [history, setHistory] = useState<ShareRecord[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const record: ShareRecord = {
      id: crypto.randomUUID(),
      email: form.email,
      providerType: form.providerType,
      scope: "Full Access",
      expiry: EXPIRY_LABELS[form.expiry],
      status: "active",
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    setHistory((prev) => [record, ...prev]);
    setForm({ email: "", providerType: "practitioner", expiry: "24h" });
    setErrors({});
  }

  function revokeRecord(id: string) {
    setHistory((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "revoked" as ShareStatus } : r))
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <PortalHeader activeTab="share" />

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Share Form Card ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <Share2 className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-bold">
              Share Data with Healthcare Provider
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-6 ml-8">
            Generate a secure, time-limited QR code for your provider to access
            your wellness data. All sharing is encrypted and HIPAA-compliant.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                <Mail className="h-3.5 w-3.5" />
                Healthcare Provider Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="provider@example.com"
                className={`w-full bg-gray-900/50 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-colors ${
                  errors.email
                    ? "border-red-400 focus:border-red-400"
                    : "border-gray-700 focus:border-green-400/40"
                }`}
              />
              {errors.email && (
                <p className="text-red-400 text-[10px] mt-1">{errors.email}</p>
              )}
            </div>

            {/* Provider Type */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                <Shield className="h-3.5 w-3.5" />
                Provider Type
              </label>
              <div className="relative">
                <select
                  value={form.providerType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      providerType: e.target.value as ProviderType,
                    }))
                  }
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:ring-0 focus:border-green-400/40"
                >
                  <option value="practitioner">Practitioner</option>
                  <option value="naturopath">Naturopath</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Expiry Duration */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                <Clock className="h-3.5 w-3.5" />
                Expiry Duration
              </label>
              <div className="relative">
                <select
                  value={form.expiry}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expiry: e.target.value as ExpiryDuration,
                    }))
                  }
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:ring-0 focus:border-green-400/40"
                >
                  <option value="24h">24 hours</option>
                  <option value="48h">48 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Data Scope */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Data Scope
              </label>
              <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-400 font-medium">
                  Full Access (All Data)
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-green-400 text-gray-900 rounded-lg py-3 text-sm font-bold hover:bg-green-300 transition-colors"
            >
              <QrCode className="h-4 w-4" />
              Generate Access Code
            </button>
          </form>
        </section>

        {/* ── 2. Sharing History Card ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-6">
          <h3 className="font-bold text-lg mb-1">Sharing History</h3>
          <p className="text-xs text-gray-500 mb-4">
            Previously generated access codes and their status.
          </p>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <Share2 className="h-8 w-8 text-gray-600" />
              </div>
              <h4 className="text-gray-400 font-medium">
                No sharing codes generated yet
              </h4>
              <p className="text-gray-600 text-sm mt-1 max-w-xs">
                Use the form above to generate a secure access code for your
                healthcare provider.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop table header */}
              <div className="hidden lg:grid lg:grid-cols-6 gap-3 text-[10px] text-gray-500 uppercase tracking-wider px-4">
                <span>Provider</span>
                <span>Type</span>
                <span>Scope</span>
                <span>Expiry</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              {history.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-900/40 border border-gray-700 rounded-xl p-4"
                >
                  {/* Desktop row */}
                  <div className="hidden lg:grid lg:grid-cols-6 gap-3 items-center">
                    <div>
                      <p className="text-sm font-medium truncate">
                        {record.email}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {record.createdAt}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {PROVIDER_LABELS[record.providerType]}
                    </span>
                    <span className="text-sm text-gray-400">{record.scope}</span>
                    <span className="text-sm text-gray-400">{record.expiry}</span>
                    <span
                      className={`${statusStyles[record.status]} text-[10px] px-2 py-0.5 rounded uppercase font-bold w-fit`}
                    >
                      {record.status}
                    </span>
                    <div className="text-right">
                      {record.status === "active" && (
                        <button
                          onClick={() => revokeRecord(record.id)}
                          className="flex items-center gap-1 ml-auto px-3 py-1 border border-red-400/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-400/5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="lg:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {record.email}
                      </p>
                      <span
                        className={`${statusStyles[record.status]} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                      <span>
                        Type:{" "}
                        <span className="text-gray-400">
                          {PROVIDER_LABELS[record.providerType]}
                        </span>
                      </span>
                      <span>
                        Scope:{" "}
                        <span className="text-gray-400">{record.scope}</span>
                      </span>
                      <span>
                        Expiry:{" "}
                        <span className="text-gray-400">{record.expiry}</span>
                      </span>
                      <span>
                        Created:{" "}
                        <span className="text-gray-400">
                          {record.createdAt}
                        </span>
                      </span>
                    </div>
                    {record.status === "active" && (
                      <button
                        onClick={() => revokeRecord(record.id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-400/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-400/5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
