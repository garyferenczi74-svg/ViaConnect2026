'use client';

import PluginManager from '@/components/settings/PluginManager';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PractitionerPluginsPage() {
  return (
    <div className="min-h-screen bg-white px-4 md:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/practitioner/settings"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Settings
          </Link>
        </div>
        <PluginManager portal="practitioner" />
      </div>
    </div>
  );
}
