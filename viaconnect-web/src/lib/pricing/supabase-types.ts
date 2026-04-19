// Shared Supabase client type for pricing business logic.
// Extracted so the logic modules can accept the canonical typed client
// without pulling in the @supabase/ssr Next.js runtime.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export type PricingSupabaseClient = SupabaseClient<Database>;
