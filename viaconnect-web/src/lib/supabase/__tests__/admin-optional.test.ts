// Prompt #170 Phase 1q hotfix tests for tryCreateAdminClient.
//
// Asserts the optional helper returns null when SUPABASE_SERVICE_ROLE_KEY is
// missing and a SupabaseClient instance when both URL + key are present.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockCreateClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { tryCreateAdminClient } from '../admin-optional';

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeEach(() => {
  mockCreateClient.mockReset();
  mockCreateClient.mockImplementation(() => ({ __mock: 'supabase-client' }));
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  }
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
  }
});

describe('tryCreateAdminClient', () => {
  it('returns null when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const client = tryCreateAdminClient();
    expect(client).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns null when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';

    const client = tryCreateAdminClient();
    expect(client).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns a SupabaseClient when both env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';

    const client = tryCreateAdminClient();
    expect(client).not.toBeNull();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'svc-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  });
});
