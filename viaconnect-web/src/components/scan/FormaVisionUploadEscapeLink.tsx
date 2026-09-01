'use client';

import Link from 'next/link';
import { ImagePlus } from 'lucide-react';
import { formavisionUploadHref } from '@/lib/body-tracker/compositionNav';

interface FormaVisionUploadEscapeLinkProps {
  testId: string;
}

export function FormaVisionUploadEscapeLink({ testId }: FormaVisionUploadEscapeLinkProps) {
  return (
    <Link
      href={formavisionUploadHref()}
      data-testid={testId}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 sm:w-auto"
    >
      <ImagePlus size={16} strokeWidth={1.5} />
      Upload saved images
    </Link>
  );
}
