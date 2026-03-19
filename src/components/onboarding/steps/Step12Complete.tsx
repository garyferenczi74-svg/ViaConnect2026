"use client";

import Link from "next/link";
import { useOnboarding } from "@/lib/onboarding-context";

const portalRoutes = {
  wellness: "/wellness",
  practitioner: "/practitioner",
  naturopath: "/naturopath",
} as const;

const portalColors = {
  wellness: { bg: "bg-green-600 hover:bg-green-700", light: "bg-green-50 text-green-800" },
  practitioner: { bg: "bg-blue-600 hover:bg-blue-700", light: "bg-blue-50 text-blue-800" },
  naturopath: { bg: "bg-amber-600 hover:bg-amber-700", light: "bg-amber-50 text-amber-800" },
} as const;

const portalLabels = {
  wellness: "Personal Wellness",
  practitioner: "Practitioner",
  naturopath: "Naturopath",
} as const;

export default function Step12Complete() {
  const { data } = useOnboarding();
  const portal = (data.accountType || "wellness") as keyof typeof portalRoutes;
  const colors = portalColors[portal];

  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome aboard, {data.firstName || "friend"}!
      </h2>
      <p className="text-lg text-gray-600 leading-relaxed mb-8">
        Your profile is set up and your {portalLabels[portal]} portal is ready.
        {data.geneticDataSource === "order-kit"
          ? " Your collection kit will be shipped within 2 business days. In the meantime, explore the platform with sample data."
          : data.geneticDataSource === "upload"
          ? " Your genetic data is being processed. You'll receive a notification when your personalized reports are ready."
          : data.geneticDataSource === "already-analyzed"
          ? " We're importing your existing genetic analysis. Your personalized dashboard will be populated shortly."
          : " You can add your genetic data at any time from your settings to unlock personalized recommendations."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-800">{data.healthGoals.length}</p>
          <p className="text-sm text-gray-500">Health Goals</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-800">
            {data.conditions.filter((c) => c !== "None of the above").length}
          </p>
          <p className="text-sm text-gray-500">Conditions Tracked</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-800">{data.currentSupplements.length}</p>
          <p className="text-sm text-gray-500">Current Supplements</p>
        </div>
      </div>

      <div className={`inline-block ${colors.light} rounded-xl px-6 py-3 text-sm font-medium mb-8`}>
        Entering: {portalLabels[portal]} Portal
      </div>

      <div className="space-y-3">
        <Link
          href={portalRoutes[portal]}
          className={`block w-full py-3 ${colors.bg} text-white rounded-xl font-medium text-lg transition-colors`}
        >
          Enter Your Portal →
        </Link>
        <Link
          href="/"
          className="block w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
        >
          Return to Home
        </Link>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        You can update any of your profile information from the Settings page inside your portal.
      </p>
    </div>
  );
}
