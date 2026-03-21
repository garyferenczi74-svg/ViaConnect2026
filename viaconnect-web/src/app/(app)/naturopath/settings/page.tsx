import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const settingsSections = [
  {
    title: "Practice Info",
    description: "Your practice name, address, phone, and website",
    fields: [
      { label: "Practice Name", placeholder: "e.g. Harmony Naturopathic Clinic" },
      { label: "Address", placeholder: "123 Wellness Ave, Buffalo, NY 14201" },
      { label: "Phone", placeholder: "(716) 555-0199" },
      { label: "Website", placeholder: "https://example.com" },
    ],
  },
  {
    title: "Credentials",
    description: "Professional licenses, certifications, and NPI number",
    fields: [
      { label: "NPI Number", placeholder: "1234567890" },
      { label: "License Number", placeholder: "ND-12345" },
      { label: "State", placeholder: "New York" },
      { label: "Expiration", placeholder: "12/2027" },
    ],
  },
  {
    title: "Billing",
    description: "Payment processing, invoicing, and subscription plan",
    fields: [
      { label: "Billing Email", placeholder: "billing@example.com" },
      { label: "Current Plan", placeholder: "Practitioner — $128.88/mo" },
    ],
  },
  {
    title: "Notification Preferences",
    description: "Configure email, SMS, and push notification settings",
    fields: [
      { label: "Email Notifications", placeholder: "Enabled" },
      { label: "SMS Alerts", placeholder: "Disabled" },
      { label: "Push Notifications", placeholder: "Enabled" },
      { label: "Weekly Digest", placeholder: "Enabled" },
    ],
  },
];

export default async function SettingsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Practice Settings
            </h1>
            <p className="mt-1 text-gray-400">
              Manage your practice profile, credentials, and preferences
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {settingsSections.map((section) => (
            <div
              key={section.title}
              className="glass rounded-xl border border-dark-border p-6"
            >
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-white">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {section.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {field.label}
                    </label>
                    <div className="h-10 rounded-lg border border-dark-border bg-white/5 px-4 py-2 text-sm text-gray-400">
                      {field.placeholder}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button className="rounded-lg bg-sage/20 px-6 py-2 text-sm font-medium text-sage hover:bg-sage/30">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
