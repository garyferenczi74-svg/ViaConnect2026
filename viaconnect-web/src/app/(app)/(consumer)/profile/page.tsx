import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const email = user?.email ?? "";

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-copper hover:underline"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">
            Account Settings
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your personal information, subscription, and preferences.
          </p>
        </div>

        {/* Personal Info */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-white">
                {displayName}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-white">
                {email}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-gray-500">
                Not provided
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Subscription
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4 border border-copper border-opacity-40">
              <h4 className="text-white font-semibold">Gold</h4>
              <p className="text-copper text-2xl font-bold mt-1">$8.88/mo</p>
              <p className="text-gray-400 text-xs mt-2">
                Basic genetic insights, supplement recommendations, and
                ViaTokens earning.
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-plum border-opacity-40">
              <h4 className="text-white font-semibold">Platinum</h4>
              <p className="text-plum text-2xl font-bold mt-1">$28.88/mo</p>
              <p className="text-gray-400 text-xs mt-2">
                Full 6-panel access, AI-powered formulations, practitioner
                messaging, and priority support.
              </p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Current plan: <span className="text-white font-medium">Free</span>
          </p>
        </div>

        {/* Notification Preferences */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Notification Preferences
          </h3>
          <div className="space-y-3">
            {[
              "Supplement reminders",
              "New genetic insights",
              "ViaTokens updates",
              "Practitioner messages",
              "Promotional offers",
            ].map((pref) => (
              <div
                key={pref}
                className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
              >
                <span className="text-gray-400 text-sm">{pref}</span>
                <div className="w-10 h-5 bg-dark-surface border border-dark-border rounded-full relative">
                  <div className="w-4 h-4 bg-gray-500 rounded-full absolute top-0.5 left-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Export */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Data Export
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Download a copy of your health data, genetic results, and account
            information.
          </p>
          <button className="bg-teal hover:bg-teal/80 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Request Data Export
          </button>
        </div>
      </div>
    </div>
  );
}
