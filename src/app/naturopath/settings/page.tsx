"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function NaturopathSettingsPage() {
  const [herbAlerts, setHerbAlerts] = useState(true);
  const [contraindCheck, setContraindCheck] = useState(true);

  return (
    <div>
      <Header portal="naturopath" title="Settings" subtitle="Configure your naturopathic practice preferences" />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="font-semibold text-gray-800">Practice Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Naturopath Name</label>
              <input
                type="text"
                defaultValue="Dr. Marina Voss, ND"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">License Number</label>
              <input
                type="text"
                defaultValue="ND-2022-45210"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Modalities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                "Botanical Medicine",
                "Clinical Nutrition",
                "Homeopathy",
                "Hydrotherapy",
                "Traditional Chinese Medicine",
              ].map((mod) => (
                <span
                  key={mod}
                  className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200 cursor-pointer hover:bg-amber-100"
                >
                  {mod}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Dispensary / Supplier</label>
            <select className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full">
              <option>MediHerb Professional</option>
              <option>Herb Pharm</option>
              <option>Gaia Herbs Professional</option>
              <option>Custom Dispensary</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Clinical Preferences</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Herb-Gene Interaction Alerts</p>
              <p className="text-xs text-gray-400">Notify when herbs may interact with client gene variants</p>
            </div>
            <button
              onClick={() => setHerbAlerts(!herbAlerts)}
              className={`w-12 h-6 rounded-full transition-colors ${herbAlerts ? "bg-amber-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${herbAlerts ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Contraindication Checking</p>
              <p className="text-xs text-gray-400">Auto-check formulations against known contraindications</p>
            </div>
            <button
              onClick={() => setContraindCheck(!contraindCheck)}
              className={`w-12 h-6 rounded-full transition-colors ${contraindCheck ? "bg-amber-500" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${contraindCheck ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Default Preparation Form</p>
            <select className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="tincture">Tincture</option>
              <option value="capsule">Capsule</option>
              <option value="tea">Herbal Tea</option>
              <option value="topical">Topical Preparation</option>
            </select>
          </div>
        </div>

        <button className="bg-amber-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-amber-700 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
