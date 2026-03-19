"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function PractitionerSettingsPage() {
  const [autoProtocol, setAutoProtocol] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  return (
    <div>
      <Header portal="practitioner" title="Settings" subtitle="Configure your practitioner portal preferences" />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="font-semibold text-gray-800">Practice Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Practitioner Name</label>
              <input
                type="text"
                defaultValue="Dr. Rebecca Torres"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">License Number</label>
              <input
                type="text"
                defaultValue="MD-2024-88901"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Specialty</label>
            <select
              defaultValue="integrative"
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="integrative">Integrative Medicine</option>
              <option value="functional">Functional Medicine</option>
              <option value="internal">Internal Medicine</option>
              <option value="endocrinology">Endocrinology</option>
              <option value="cardiology">Cardiology</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Practice Name</label>
            <input
              type="text"
              defaultValue="Torres Integrative Health"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Clinical Preferences</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-Generate Protocols</p>
              <p className="text-xs text-gray-400">Automatically suggest supplement protocols from genomic data</p>
            </div>
            <button
              onClick={() => setAutoProtocol(!autoProtocol)}
              className={`w-12 h-6 rounded-full transition-colors ${autoProtocol ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoProtocol ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Critical Variant Alerts</p>
              <p className="text-xs text-gray-400">Notify when high-risk gene variants are detected in patient data</p>
            </div>
            <button
              onClick={() => setCriticalAlerts(!criticalAlerts)}
              className={`w-12 h-6 rounded-full transition-colors ${criticalAlerts ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${criticalAlerts ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Default Report Format</p>
            <select className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="clinical">Clinical Summary</option>
              <option value="detailed">Detailed with Pathways</option>
              <option value="patient-facing">Patient-Facing Report</option>
            </select>
          </div>
        </div>

        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
