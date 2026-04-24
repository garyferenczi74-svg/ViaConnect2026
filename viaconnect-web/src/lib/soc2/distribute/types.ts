// Prompt #122 P5: distribution shared types.

import type { SupabaseClient } from '@supabase/supabase-js';

export type DistributionPlatform = 'drata' | 'vanta' | 'manual_download';

export interface DistributionTargetRow {
  platform: DistributionPlatform;
  enabled: boolean;
  api_url: string | null;
  api_key_ref: string | null;
  notes: string | null;
}

export interface DistributionAttemptInput {
  supabase: SupabaseClient;
  packetId: string;
  platform: DistributionPlatform;
  httpStatus?: number;
  status: 'succeeded' | 'failed' | 'retrying';
  responseExcerpt?: string;
  errorMessage?: string;
  uploadedFilesCount?: number;
}

export interface DistributionResult {
  platform: DistributionPlatform;
  status: 'succeeded' | 'failed' | 'skipped';
  httpStatus?: number;
  errorMessage?: string;
}
