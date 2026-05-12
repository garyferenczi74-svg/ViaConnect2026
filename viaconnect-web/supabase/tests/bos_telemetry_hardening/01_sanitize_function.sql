-- pgTAP: bos_sanitize_error_message(text) parity suite
--
-- Mirrors the TypeScript test cases in
-- src/lib/scoring/__tests__/sanitize-error.test.ts so the SQL and TS
-- sanitizers stay in lockstep. Any rule change in one must be reflected
-- in the other and verified by this suite.
BEGIN;
SELECT plan(15);

-- Null handling
SELECT is(
  public.bos_sanitize_error_message(NULL),
  NULL::text,
  'null input returns null'
);

-- Empty string passes through
SELECT is(
  public.bos_sanitize_error_message(''),
  '',
  'empty string returns empty string'
);

-- UUID redaction: lowercase
SELECT is(
  public.bos_sanitize_error_message('failed for 550e8400-e29b-41d4-a716-446655440000'),
  'failed for <uuid>',
  'lowercase UUID redacted to <uuid>'
);

-- UUID redaction: uppercase
SELECT is(
  public.bos_sanitize_error_message('failed for 550E8400-E29B-41D4-A716-446655440000'),
  'failed for <uuid>',
  'uppercase UUID redacted to <uuid>'
);

-- UUID redaction: mixed case
SELECT is(
  public.bos_sanitize_error_message('failed for 550e8400-E29B-41d4-A716-446655440000'),
  'failed for <uuid>',
  'mixed case UUID redacted to <uuid>'
);

-- UUID redaction: multiple in one message
SELECT is(
  public.bos_sanitize_error_message(
    'compare 550e8400-e29b-41d4-a716-446655440000 and 6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  ),
  'compare <uuid> and <uuid>',
  'multiple UUIDs all redacted'
);

-- UUID at start
SELECT is(
  public.bos_sanitize_error_message('550e8400-e29b-41d4-a716-446655440000 not found'),
  '<uuid> not found',
  'UUID at start of message redacted'
);

-- Almost-UUID (wrong last segment length) must NOT match
SELECT is(
  public.bos_sanitize_error_message('almost 550e8400-e29b-41d4-a716-44665544000'),
  'almost 550e8400-e29b-41d4-a716-44665544000',
  'almost-UUID with 11 char last segment passes through unchanged'
);

-- Truncation: 499 char input passes through unchanged
SELECT is(
  length(public.bos_sanitize_error_message(repeat('a', 499))),
  499,
  '499 char message unchanged'
);

-- Truncation: 500 char input passes through unchanged
SELECT is(
  length(public.bos_sanitize_error_message(repeat('a', 500))),
  500,
  '500 char message unchanged'
);

-- Truncation: 501 char input truncated to 500
SELECT is(
  length(public.bos_sanitize_error_message(repeat('a', 501))),
  500,
  '501 char message truncated to 500 chars'
);

SELECT ok(
  public.bos_sanitize_error_message(repeat('a', 501)) LIKE '%' || ' ...',
  '501 char truncated message ends with space + three dots'
);

-- Truncation: 5000 char input truncated to 500
SELECT is(
  length(public.bos_sanitize_error_message(repeat('a', 5000))),
  500,
  '5000 char message truncated to 500 chars'
);

-- Combined: UUID redaction happens BEFORE truncation; redacted then truncated
SELECT is(
  length(
    public.bos_sanitize_error_message(
      repeat('x', 100) || '550e8400-e29b-41d4-a716-446655440000' || repeat('y', 600)
    )
  ),
  500,
  'UUID-bearing 736 char message truncated to 500 chars'
);

SELECT ok(
  position(
    '<uuid>' IN
    public.bos_sanitize_error_message(
      repeat('x', 100) || '550e8400-e29b-41d4-a716-446655440000' || repeat('y', 600)
    )
  ) > 0,
  '<uuid> token survives in combined redaction + truncation output'
);

SELECT * FROM finish();
ROLLBACK;
