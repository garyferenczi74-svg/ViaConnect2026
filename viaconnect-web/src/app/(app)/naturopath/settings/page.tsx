"use client";

import { useState } from "react";
import {
  Save,
  Building2,
  Award,
  Bell,
  Beaker,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Card, Button, Badge, Input } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationPref = {
  id: string;
  label: string;
  email: boolean;
  push: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Practice Profile state
  const [practice, setPractice] = useState({
    name: "Harmony Naturopathic Clinic",
    npi: "1234567890",
    license: "ND-48291",
    specialty: "Naturopathic Medicine",
    address: "742 Elmwood Ave, Buffalo, NY 14222",
    phone: "(716) 555-0199",
    email: "dr.thompson@harmonyclinic.com",
    website: "https://harmonyclinic.com",
  });

  // Credentials state
  const [credentials] = useState({
    ndLicense: "ND-48291",
    state: "New York",
    expiration: "December 2027",
    dea: "FT-1234567",
    ndVerified: true,
    deaVerified: false,
    certifications: [
      { name: "Board Certified Naturopathic Doctor", org: "AANP" },
      { name: "Certified in Botanical Medicine", org: "AHG" },
    ],
  });

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPref[]>([
    { id: "new-patient", label: "New patient registration", email: true, push: true },
    { id: "appointments", label: "Appointment reminders", email: true, push: true },
    { id: "formulas", label: "Formula approvals", email: true, push: false },
    { id: "compliance", label: "Compliance alerts", email: true, push: true },
    { id: "lab-results", label: "Lab results", email: true, push: true },
    { id: "system", label: "System updates", email: false, push: false },
  ]);

  // Dispensary settings
  const [dispensary, setDispensary] = useState({
    prepMethod: "Tincture",
    labelTemplate: "Standard — Practice Name + Patient",
    stockThreshold: "15",
    connectedSystem: "Connected",
  });

  const updatePractice = (field: string, value: string) => {
    setPractice((prev) => ({ ...prev, [field]: value }));
  };

  const toggleNotification = (id: string, channel: "email" | "push") => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, [channel]: !n[channel] } : n
      )
    );
  };

  const subscriptionFeatures = [
    "Unlimited patient protocols",
    "Full botanical database access",
    "Constitutional assessment tools",
    "Custom formula builder",
    "HIPAA compliance dashboard",
    "Priority support",
    "ViaConnect AI clinical insights",
    "Dispensary integration",
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <StaggerChild className="mb-8">
          <h1 className="text-3xl font-bold text-white">Practice Settings</h1>
          <p className="mt-1 text-gray-400">
            Manage your practice profile, credentials, and preferences
          </p>
        </StaggerChild>

        <StaggerChild className="space-y-8">
          {/* ─── Practice Profile ─────────────────────────────────────────── */}
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Practice Profile</h2>
                <p className="text-sm text-gray-400">Your practice information visible to patients</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Practice Name"
                value={practice.name}
                onChange={(e) => updatePractice("name", e.target.value)}
              />
              <Input
                label="NPI Number"
                value={practice.npi}
                onChange={(e) => updatePractice("npi", e.target.value)}
              />
              <Input
                label="License (ND)"
                value={practice.license}
                onChange={(e) => updatePractice("license", e.target.value)}
              />
              <Input
                label="Specialty"
                value={practice.specialty}
                onChange={(e) => updatePractice("specialty", e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  value={practice.address}
                  onChange={(e) => updatePractice("address", e.target.value)}
                />
              </div>
              <Input
                label="Phone"
                value={practice.phone}
                onChange={(e) => updatePractice("phone", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={practice.email}
                onChange={(e) => updatePractice("email", e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Website"
                  value={practice.website}
                  onChange={(e) => updatePractice("website", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button className="bg-sage hover:bg-sage/80 text-white">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </Card>

          {/* ─── Credentials & Licenses ──────────────────────────────────── */}
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Credentials & Licenses</h2>
                <p className="text-sm text-gray-400">Professional licenses and certification status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              {/* ND License */}
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">ND License</span>
                  <Badge variant={credentials.ndVerified ? "active" : "pending"}>
                    {credentials.ndVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">{credentials.ndLicense}</p>
                <p className="text-xs text-gray-500 mt-1">State: {credentials.state}</p>
                <p className="text-xs text-gray-500">Expires: {credentials.expiration}</p>
              </div>

              {/* DEA */}
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">DEA Number</span>
                  <Badge variant={credentials.deaVerified ? "active" : "pending"}>
                    {credentials.deaVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">{credentials.dea}</p>
                <p className="text-xs text-gray-500 mt-1">State: {credentials.state}</p>
              </div>
            </div>

            {/* Certifications */}
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Certifications</h3>
            <div className="space-y-2">
              {credentials.certifications.map((cert) => (
                <div
                  key={cert.name}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <ShieldCheck className="w-4 h-4 text-sage shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white">{cert.name}</p>
                    <p className="text-xs text-gray-500">{cert.org}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Notification Preferences ────────────────────────────────── */}
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
                <p className="text-sm text-gray-400">Configure how you receive alerts and updates</p>
              </div>
            </div>

            {/* Column Headers */}
            <div className="flex items-center gap-4 px-4 pb-3 border-b border-white/[0.06] mb-1">
              <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Notification</span>
              <span className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Email</span>
              <span className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Push</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="flex-1 text-sm text-gray-300">{n.label}</span>

                  {/* Email toggle */}
                  <div className="w-16 flex justify-center">
                    <button
                      onClick={() => toggleNotification(n.id, "email")}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        n.email ? "bg-sage" : "bg-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          n.email ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Push toggle */}
                  <div className="w-16 flex justify-center">
                    <button
                      onClick={() => toggleNotification(n.id, "push")}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        n.push ? "bg-sage" : "bg-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          n.push ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Dispensary Settings ──────────────────────────────────────── */}
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center">
                <Beaker className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Dispensary Settings</h2>
                <p className="text-sm text-gray-400">Configure dispensary integration and defaults</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <Input
                label="Default Preparation Method"
                value={dispensary.prepMethod}
                onChange={(e) => setDispensary((prev) => ({ ...prev, prepMethod: e.target.value }))}
              />
              <Input
                label="Label Template"
                value={dispensary.labelTemplate}
                onChange={(e) => setDispensary((prev) => ({ ...prev, labelTemplate: e.target.value }))}
              />
              <Input
                label="Herb Stock Alert Threshold"
                value={dispensary.stockThreshold}
                onChange={(e) => setDispensary((prev) => ({ ...prev, stockThreshold: e.target.value }))}
                type="number"
              />
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-gray-400">Connected Dispensary</span>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  <div className="w-2 h-2 rounded-full bg-portal-green animate-pulse" />
                  <span className="text-sm text-portal-green font-medium">Connected</span>
                  <span className="text-xs text-gray-500 ml-auto">NaturaLink Dispensary</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="bg-sage hover:bg-sage/80 text-white" size="sm">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Dispensary Settings
              </Button>
            </div>
          </Card>

          {/* ─── Subscription ────────────────────────────────────────────── */}
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-sage/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-sage" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Subscription</h2>
                <p className="text-sm text-gray-400">Your current plan and billing</p>
              </div>
            </div>

            <div className="rounded-lg border border-sage/20 bg-sage/5 p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Practitioner Plan</h3>
                  <p className="text-sage text-sm font-semibold">$128.88/mo</p>
                </div>
                <Badge variant="active">Active</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subscriptionFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Next billing date: April 1, 2026
              </p>
              <Button variant="secondary" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Manage Subscription
              </Button>
            </div>
          </Card>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
