'use client';

import { useState } from 'react';
import { FileText, Download, Send } from 'lucide-react';
import type { Interaction } from './InteractionEngine';

// ── Toolbar (above card list) ──

export function Toolbar({ interactionCount, patientId }: { interactionCount: number; patientId: string }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.60)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-white transition-all">
        <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
        Export PDF
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.60)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-white transition-all">
        <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
        Export CSV
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[rgba(45,165,160,0.12)] text-[#2DA5A0] border border-[rgba(45,165,160,0.25)] hover:bg-[rgba(45,165,160,0.20)] transition-all">
        <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
        Send to Patient
      </button>
    </div>
  );
}

// ── CYP450 Panel ──

export function CYP450Panel({ enzymes }: { enzymes: string[] }) {
  if (!enzymes.length) return null;
  return (
    <div className="rounded-xl bg-[#172542] p-3">
      <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-2">
        CYP450 Enzymes Involved
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {enzymes.map(e => (
          <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[#A78BFA] border border-[rgba(139,92,246,0.30)] font-mono">
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Override Controls ──

export function OverrideControls({ interactionId, onOverride }: {
  interactionId: string;
  onOverride: (id: string, type: 'approve' | 'confirm_block', notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (type: 'approve' | 'confirm_block') => {
    if (!notes.trim()) return;
    setSubmitting(true);
    await onOverride(interactionId, type, notes);
    setSubmitting(false);
    setNotes('');
  };

  return (
    <div className="rounded-xl bg-[rgba(183,94,24,0.08)] border border-[rgba(183,94,24,0.20)] p-4 space-y-3">
      <p className="text-xs font-semibold text-[#FB923C] uppercase tracking-wide">
        Clinical Override
      </p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Clinical reasoning for override (required)..."
        rows={3}
        className="w-full text-xs text-white bg-[#172542] border border-[rgba(255,255,255,0.15)] rounded-xl p-3 placeholder:text-[rgba(255,255,255,0.30)] focus:border-[#2DA5A0] focus:ring-2 focus:ring-[#2DA5A0]/15 resize-none outline-none"
      />
      <div className="flex gap-2">
        <button
          disabled={!notes.trim() || submitting}
          onClick={() => handleSubmit('approve')}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#2DA5A0] text-white hover:bg-[#1A8A85] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Approve for Patient
        </button>
        <button
          disabled={!notes.trim() || submitting}
          onClick={() => handleSubmit('confirm_block')}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#F87171] border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.25)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm Block
        </button>
      </div>
    </div>
  );
}

// ── Card Section (rendered inside expanded card) ─��

export function CardSection({ interaction, onOverride }: {
  interaction: Interaction;
  onOverride: (id: string, type: 'approve' | 'confirm_block', notes: string) => void;
}) {
  const enzymes = interaction.cypEnzymes ?? [];
  return (
    <div className="space-y-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
      {enzymes.length > 0 && <CYP450Panel enzymes={enzymes} />}
      {interaction.severity === 'major' && !interaction.overrideApproved && (
        <OverrideControls interactionId={interaction.id} onOverride={onOverride} />
      )}
    </div>
  );
}
