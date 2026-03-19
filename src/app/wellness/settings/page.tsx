"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function WellnessSettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [reportFrequency, setReportFrequency] = useState("monthly");

  return (
    <div>
      <Header portal="wellness" title="Settings" subtitle="Manage your wellness portal preferences" />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="font-semibold text-gray-800">Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue="Alex Johnson"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                defaultValue="alex.j@email.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Date of Birth</label>
            <input
              type="date"
              defaultValue="1990-05-15"
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Preferences</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Email Notifications</p>
              <p className="text-xs text-gray-400">Receive updates on new reports and recommendations</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${notifications ? "bg-green-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Data Sharing</p>
              <p className="text-xs text-gray-400">Share anonymized data for research purposes</p>
            </div>
            <button
              onClick={() => setDataSharing(!dataSharing)}
              className={`w-12 h-6 rounded-full transition-colors ${dataSharing ? "bg-green-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${dataSharing ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Report Frequency</p>
            <select
              value={reportFrequency}
              onChange={(e) => setReportFrequency(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Genetic Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload your raw genetic data file (23andMe, AncestryDNA, or whole genome sequencing).
          </p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">Drag and drop your file here, or click to browse</p>
            <p className="text-xs text-gray-300 mt-2">Supported: .txt, .csv, .vcf (max 50MB)</p>
          </div>
        </div>

        <button className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
