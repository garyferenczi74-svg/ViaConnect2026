// Prompt #124 P5 §15.5: plain-language privacy notice for consumers.

import { Eye, Timer, Trash2 } from 'lucide-react';

export default function PrivacyNotice() {
  return (
    <section className="rounded-lg border border-white/[0.12] bg-white/[0.03] p-4 space-y-3 text-sm text-white/80">
      <h2 className="text-base font-semibold text-white">Before you submit: how we handle your report</h2>
      <ul className="space-y-2">
        <Item icon={<Eye className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />}>
          A human compliance specialist reviews every report. We compare your photos against authentic FarmCeutica packaging references.
        </Item>
        <Item icon={<Timer className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />}>
          Photos are stored privately for up to 2 years (or the duration of an active legal matter). If we confirm the product is non, authentic, we may include your photos in a platform takedown submission. Personal information is redacted first.
        </Item>
        <Item icon={<Trash2 className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />}>
          If your photos include a prescription label or other personal information, we automatically blur that information before our compliance review. You can ask us to delete your report at any time.
        </Item>
      </ul>
    </section>
  );
}

function Item({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {icon}
      <span className="text-sm text-white/80">{children}</span>
    </li>
  );
}
