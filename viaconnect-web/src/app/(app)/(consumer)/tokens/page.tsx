import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TokensPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-copper hover:underline"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">
            ViaTokens Wallet
          </h1>
          <p className="text-gray-400 mt-2">
            Earn tokens for protocol adherence and wellness milestones. Redeem
            for discounts on supplements and services.
          </p>
        </div>

        {/* Balance */}
        <div className="glass rounded-2xl p-8 border border-plum border-opacity-40 text-center">
          <p className="text-gray-400 text-sm uppercase tracking-wider">
            Token Balance
          </p>
          <p className="text-5xl font-bold text-white mt-2">
            0 <span className="text-plum text-2xl">VT</span>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Start earning by completing your genetic profile and logging
            supplement adherence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earning History */}
          <div className="glass rounded-2xl p-6 border border-dark-border">
            <h3 className="text-lg font-semibold text-white mb-4">
              Earning History
            </h3>
            <div className="space-y-3">
              {[
                "Complete genetic profile upload",
                "Log daily supplement intake",
                "Finish CAQ assessment",
                "Refer a friend",
                "7-day adherence streak",
              ].map((action) => (
                <div
                  key={action}
                  className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
                >
                  <span className="text-gray-400 text-sm">{action}</span>
                  <span className="text-plum text-sm font-medium">
                    +0 VT
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Redemption */}
          <div className="glass rounded-2xl p-6 border border-dark-border">
            <h3 className="text-lg font-semibold text-white mb-4">
              Redeem Tokens
            </h3>
            <div className="space-y-3">
              {[
                { reward: "10% supplement discount", cost: "500 VT" },
                { reward: "Free shipping", cost: "250 VT" },
                { reward: "1 month Gold upgrade", cost: "1,000 VT" },
                { reward: "Practitioner consultation", cost: "2,500 VT" },
              ].map((item) => (
                <div
                  key={item.reward}
                  className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
                >
                  <span className="text-gray-400 text-sm">{item.reward}</span>
                  <span className="text-copper text-sm font-medium">
                    {item.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
