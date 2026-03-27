'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Building2, Edit3, Dna, Lightbulb, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { VCButton } from '@/components/ui/VCButton';

export default function LabsPage() {
  const handleAction = () => {
    toast.success('Connection flow coming soon \u2014 Terra API integration in progress');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/plugins"
        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <ArrowLeft size={16} />
        Plugins
      </Link>

      {/* Title */}
      <h1 className="text-heading-2" style={{ color: 'var(--text-heading-orange)' }}>
        Connect Lab Results
      </h1>

      {/* Subtitle */}
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
        Feed biomarker data into your GeneX360 panels for genetically contextualized insights.
      </p>

      {/* Card 1 - Upload Lab Report */}
      <div
        className="glass-v2 p-6 rounded-2xl flex flex-col gap-4"
        style={{ borderLeft: '4px solid #2DA5A0' }}
      >
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
        >
          <FileText size={22} style={{ color: '#2DA5A0' }} />
        </div>
        <h3 className="text-heading-3 text-white">UPLOAD LAB REPORT (PDF)</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Upload any lab report PDF and our AI extracts biomarkers automatically via Terra Blood
          Reports API.
        </p>
        <VCButton variant="primary" size="sm" onClick={handleAction}>
          Upload PDF &rarr;
        </VCButton>
      </div>

      {/* Card 2 - Quest Diagnostics */}
      <div className="glass-v2 p-6 rounded-2xl flex flex-col gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.08)' }}
        >
          <Building2 size={22} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">QUEST DIAGNOSTICS</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Connect your Quest MyQuest account to auto-import results.
        </p>
        <VCButton variant="secondary" size="sm" onClick={handleAction}>
          Connect Quest &rarr;
        </VCButton>
      </div>

      {/* Card 3 - Labcorp */}
      <div className="glass-v2 p-6 rounded-2xl flex flex-col gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.08)' }}
        >
          <Building2 size={22} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">LABCORP</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Connect your Labcorp OnDemand account.
        </p>
        <VCButton variant="secondary" size="sm" onClick={handleAction}>
          Connect Labcorp &rarr;
        </VCButton>
      </div>

      {/* Card 4 - Manual Entry */}
      <div className="glass-v2 p-6 rounded-2xl flex flex-col gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Edit3 size={22} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">MANUAL ENTRY</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Type in individual biomarker values from any lab report.
        </p>
        <VCButton variant="ghost" size="sm" onClick={handleAction}>
          Enter Manually &rarr;
        </VCButton>
      </div>

      {/* Genetic Context Preview */}
      <div className="glass-v2-insight p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Dna size={16} style={{ color: 'var(--teal-500)' }} />
          <p className="text-overline">GENETIC CONTEXT PREVIEW</p>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          When you upload lab results, ViaConnect doesn&apos;t just show &ldquo;normal&rdquo;
          ranges. It shows <span className="text-white font-semibold">YOUR</span> genetic optimal
          range.
        </p>
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Standard range: 30&ndash;100 ng/mL
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--teal-400, #4DC9C4)' }}>
            YOUR genetic optimal: 60&ndash;80 ng/mL
          </p>
          <p
            className="text-xs font-mono mt-0.5"
            style={{ color: 'var(--teal-300, #6DD8D3)' }}
          >
            (based on VDR rs1544410 variant)
          </p>
        </div>
      </div>

      {/* ViaTokens reward note */}
      <div className="glass-v2 flex items-center gap-3 p-4 rounded-xl">
        <Coins size={20} style={{ color: '#D4A017' }} />
        <p className="text-sm font-semibold" style={{ color: '#D4A017' }}>
          +50 ViaTokens for uploading labs!
        </p>
      </div>
    </div>
  );
}
