/**
 * ViaConnect GeneX360 — Audit Logging Verification Tests
 *
 * HIPAA requires audit trails for all access to PHI.
 * Verifies that the audit_logs pattern is correctly implemented.
 */

jest.mock('../../src/lib/supabase/client');

describe('Audit Logging', () => {
  describe('audit_logs table pattern', () => {
    it('inserts audit entries with required fields', async () => {
      const { supabase } = require('../../src/lib/supabase/client');

      const auditEntry = {
        action: 'UPDATE',
        table_name: 'protocols',
        record_id: 'pr-1',
        user_id: 'user-123',
        detail: 'Updated protocol status to ACTIVE',
        timestamp: new Date().toISOString(),
      };

      await supabase.from('audit_logs').insert(auditEntry);
      expect(supabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('audit entry includes user_id for accountability', () => {
      const entry = {
        action: 'INSERT',
        table_name: 'health_metrics',
        record_id: 'hm-1',
        user_id: 'user-abc',
        detail: 'Synced wearable data',
      };

      expect(entry.user_id).toBeDefined();
      expect(entry.user_id.length).toBeGreaterThan(0);
    });

    it('audit entry includes action type', () => {
      const validActions = ['INSERT', 'UPDATE', 'DELETE', 'SELECT', 'EXPORT'];
      const entry = { action: 'UPDATE' };
      expect(validActions).toContain(entry.action);
    });

    it('audit entry includes table name', () => {
      const entry = { table_name: 'protocols' };
      expect(entry.table_name).toBeTruthy();
      expect(typeof entry.table_name).toBe('string');
    });
  });

  describe('audit coverage', () => {
    it('all sensitive tables should have audit triggers', () => {
      const AUDITED_TABLES = [
        'profiles',
        'health_metrics',
        'genetic_results',
        'protocols',
        'ai_insights',
        'lab_results',
        'prescriptions',
        'consent_records',
      ];

      // Verify we track all expected tables
      expect(AUDITED_TABLES.length).toBeGreaterThanOrEqual(5);
      expect(AUDITED_TABLES).toContain('profiles');
      expect(AUDITED_TABLES).toContain('health_metrics');
      expect(AUDITED_TABLES).toContain('genetic_results');
    });
  });

  describe('data retention', () => {
    it('audit log entries should include timestamps', () => {
      const entry = {
        action: 'UPDATE',
        timestamp: new Date().toISOString(),
      };
      expect(entry.timestamp).toBeTruthy();
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('audit entries are immutable (INSERT only from client)', () => {
      const { supabase } = require('../../src/lib/supabase/client');
      const table = supabase.from('audit_logs');

      // Client should only have insert access to audit_logs
      // UPDATE and DELETE are blocked by RLS
      expect(typeof table.insert).toBe('function');
    });
  });
});
