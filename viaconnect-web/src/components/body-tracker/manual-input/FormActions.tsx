'use client';

import { Loader2 } from 'lucide-react';

interface FormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export function FormActions({
  onCancel,
  onSave,
  saving,
  disabled,
  saveLabel = 'Save entry',
  cancelLabel = 'Cancel',
}: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="w-full sm:w-auto rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white/75 hover:bg-white/[0.06] min-h-[44px] transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || saving}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
        {saving ? 'Saving' : saveLabel}
      </button>
    </div>
  );
}
