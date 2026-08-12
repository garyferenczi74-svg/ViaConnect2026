// Prompt 214d Gap 1: standalone hannah-compile cron RETIRED.
// Compilation runs only inside Jeffery's synchronism chain Compose stage.
// Route kept for cutover diagnostics; returns 410 so Vercel/manual hits fail loud.

import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  safeLog.warn('cron.hannah-compile', 'retired: use synchronism-daily Compose stage', {
    authority: 'jeffery_chain',
  });
  return Response.json(
    {
      ok: false,
      retired: true,
      message:
        'Hannah compilation is invoked only by /api/cron/synchronism-daily (Compose stage). Standalone cron removed (Prompt 214d).',
      use: '/api/cron/synchronism-daily',
    },
    { status: 410 },
  );
}
