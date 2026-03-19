"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

export default function Step3PersonalInfo() {
  const { data, updateData, setCanProceed } = useOnboarding();
  const isProfessional = data.accountType === "practitioner" || data.accountType === "naturopath";

  useEffect(() => {
    const baseValid = data.firstName.trim() !== "" && data.lastName.trim() !== "" &&
      data.email.trim() !== "" && data.dateOfBirth !== "" && data.biologicalSex !== "";
    const proValid = !isProfessional || (data.licenseNumber.trim() !== "" && data.practiceName.trim() !== "");
    setCanProceed(baseValid && proValid);
  }, [data.firstName, data.lastName, data.email, data.dateOfBirth, data.biologicalSex,
      data.licenseNumber, data.practiceName, isProfessional, setCanProceed]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
      <p className="text-gray-500 mb-8">
        {isProfessional
          ? "Your professional details and practice information."
          : "Basic details to personalize your genomic health experience."}
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => updateData({ firstName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => updateData({ lastName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => updateData({ dateOfBirth: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biological Sex *</label>
            <select
              value={data.biologicalSex}
              onChange={(e) => updateData({ biologicalSex: e.target.value as typeof data.biologicalSex })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Required for accurate genomic analysis (e.g., hormone pathways)</p>
          </div>
        </div>

        {isProfessional && (
          <>
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                {data.accountType === "practitioner" ? "Practice Details" : "Naturopathic Practice"}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                <input
                  type="text"
                  value={data.licenseNumber}
                  onChange={(e) => updateData({ licenseNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder={data.accountType === "practitioner" ? "MD-XXXX-XXXXX" : "ND-XXXX-XXXXX"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Practice Name *</label>
                <input
                  type="text"
                  value={data.practiceName}
                  onChange={(e) => updateData({ practiceName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Your practice name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <select
                value={data.specialty}
                onChange={(e) => updateData({ specialty: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Select specialty...</option>
                {data.accountType === "practitioner" ? (
                  <>
                    <option value="integrative">Integrative Medicine</option>
                    <option value="functional">Functional Medicine</option>
                    <option value="internal">Internal Medicine</option>
                    <option value="endocrinology">Endocrinology</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="psychiatry">Psychiatry</option>
                  </>
                ) : (
                  <>
                    <option value="botanical">Botanical Medicine</option>
                    <option value="clinical-nutrition">Clinical Nutrition</option>
                    <option value="homeopathy">Homeopathy</option>
                    <option value="tcm">Traditional Chinese Medicine</option>
                    <option value="ayurveda">Ayurvedic Medicine</option>
                    <option value="general-nd">General Naturopathy</option>
                  </>
                )}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
