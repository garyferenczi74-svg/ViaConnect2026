'use client';

// Update Your Assessment card for the My Biology hub (2026-06-08).
//
// Mirrors the "Update Your Assessment" card design from the My Supplements
// page (SupplementsRetakeCard) so the two surfaces stay visually consistent.
// Sits directly under the Connections strip at the bottom of the hub. The
// Retake Assessment button reveals a confirm step, then routes to the
// Clinical Assessment Questionnaire intro at /onboarding/i-caq-intro, where
// prior answers are pre-filled so the user only updates what changed.

import { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';

export function AssessmentRetakeCard() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="absolute blur-lg -inset-1 rounded-2xl opacity-60"
              style={{ backgroundColor: '#B75E1833' }}
            />
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #B75E1833, #B75E181A, transparent)',
                border: '1px solid #B75E1826',
              }}
            >
              <RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Update Your Assessment</h4>
            <p className="text-xs text-white/30 mt-1 leading-relaxed max-w-md">
              Retake the Clinical Assessment Questionnaire to update your supplement protocol and recommendations with your current health status
            </p>
          </div>
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Retake Assessment
          </button>
        ) : (
          <div className="w-full sm:w-auto space-y-3">
            <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-4 py-3">
              <p className="text-xs text-white/40 leading-relaxed">
                This will take you through all 7 phases. Your previous answers will be{' '}
                <span className="text-white/60 font-medium">pre-filled</span> so you only need to update what has changed.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/onboarding/i-caq-intro"
                className="min-h-[44px] flex-1 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all flex items-center gap-2 justify-center"
              >
                <Check className="w-4 h-4" strokeWidth={2} /> Yes, Start Assessment
              </a>
              <button
                onClick={() => setConfirming(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssessmentRetakeCard;
