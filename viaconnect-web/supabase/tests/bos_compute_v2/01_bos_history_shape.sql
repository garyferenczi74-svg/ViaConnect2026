-- pgTAP: bio_optimization_history shape post-migration
-- Verifies new columns exist with correct types and NOT NULL, CHECK
-- constraints are present and valid, UNIQUE constraint migrated to
-- (user_id, date, compute_seq), existing idx_bio_history is preserved.
BEGIN;
SELECT plan(22);

-- New columns exist with correct types
SELECT has_column('public', 'bio_optimization_history', 'tier',
  'bio_optimization_history.tier column exists');
SELECT col_type_is('public', 'bio_optimization_history', 'tier', 'smallint',
  'bio_optimization_history.tier is smallint');
SELECT col_not_null('public', 'bio_optimization_history', 'tier',
  'bio_optimization_history.tier is NOT NULL');

SELECT has_column('public', 'bio_optimization_history', 'confidence',
  'bio_optimization_history.confidence column exists');
SELECT col_type_is('public', 'bio_optimization_history', 'confidence', 'numeric(4,3)',
  'bio_optimization_history.confidence is numeric(4,3)');
SELECT col_not_null('public', 'bio_optimization_history', 'confidence',
  'bio_optimization_history.confidence is NOT NULL');

SELECT has_column('public', 'bio_optimization_history', 'compute_version',
  'bio_optimization_history.compute_version column exists');
SELECT col_type_is('public', 'bio_optimization_history', 'compute_version', 'text',
  'bio_optimization_history.compute_version is text');
SELECT col_not_null('public', 'bio_optimization_history', 'compute_version',
  'bio_optimization_history.compute_version is NOT NULL');

SELECT has_column('public', 'bio_optimization_history', 'computed_at',
  'bio_optimization_history.computed_at column exists');
SELECT col_not_null('public', 'bio_optimization_history', 'computed_at',
  'bio_optimization_history.computed_at is NOT NULL');

SELECT has_column('public', 'bio_optimization_history', 'compute_seq',
  'bio_optimization_history.compute_seq column exists');
SELECT col_type_is('public', 'bio_optimization_history', 'compute_seq', 'smallint',
  'bio_optimization_history.compute_seq is smallint');
SELECT col_not_null('public', 'bio_optimization_history', 'compute_seq',
  'bio_optimization_history.compute_seq is NOT NULL');

-- CHECK constraints exist
SELECT has_check('public', 'bio_optimization_history',
  'bio_optimization_history has CHECK constraints');

SELECT col_has_check('public', 'bio_optimization_history', 'score',
  'score has its range CHECK');
SELECT col_has_check('public', 'bio_optimization_history', 'tier',
  'tier has its valid-values CHECK');
SELECT col_has_check('public', 'bio_optimization_history', 'confidence',
  'confidence has its range CHECK');

-- UNIQUE constraint migrated
SELECT col_is_unique('public', 'bio_optimization_history',
  ARRAY['user_id', 'date', 'compute_seq'],
  '(user_id, date, compute_seq) is unique');

-- Old (user_id, date) unique constraint is gone
SELECT hasnt_index('public', 'bio_optimization_history',
  'bio_optimization_history_user_id_date_key',
  'old (user_id, date) unique index is dropped');

-- Existing idx_bio_history is preserved
SELECT has_index('public', 'bio_optimization_history', 'idx_bio_history',
  'idx_bio_history (user_id, date DESC) still exists');

-- user_id is NOT NULL
SELECT col_not_null('public', 'bio_optimization_history', 'user_id',
  'bio_optimization_history.user_id is NOT NULL');

SELECT * FROM finish();
ROLLBACK;
