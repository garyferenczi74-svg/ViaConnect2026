'use client';

import { AlertTriangle, XCircle } from 'lucide-react';
import {
  validateField,
  SANITY_RANGES,
  type SanityFieldKey,
  type SanityResult,
} from '@/lib/body-tracker/manual-input';

export { validateField };
export type { SanityResult, SanityFieldKey };

interface FieldValidationProps {
  field: SanityFieldKey;
  value: number | null | undefined;
  className?: string;
}

export function FieldValidation({ field, value, className = '' }: FieldValidationProps) {
  const result = validateField(field, value);
  if (result === 'valid') return null;
  const range = SANITY_RANGES[field];

  if (result === 'blocked') {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#FCA5A5] ${className}`}>
        <XCircle className="h-4 w-4 flex-none mt-0.5" strokeWidth={1.5} />
        <span>
          Value outside possible range ({range.min} to {range.max}
          {range.unit ? ` ${range.unit}` : ''}). Please re check.
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#FCD34D] ${className}`}>
      <AlertTriangle className="h-4 w-4 flex-none mt-0.5" strokeWidth={1.5} />
      <span>
        Unusual but possible. Typical range: {range.softMin} to {range.softMax}
        {range.unit ? ` ${range.unit}` : ''}. Double check your reading.
      </span>
    </div>
  );
}

export function hasBlockedValues(results: SanityResult[]): boolean {
  return results.includes('blocked');
}
