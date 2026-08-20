import { describe, expect, it } from 'vitest';
import {
  assertNoDoseLexicon,
  redactDoseInstructionText,
  redactInterventionName,
} from '@/lib/thanos/doseRedaction';

describe('Prompt 225a dose redaction', () => {
  it('redacts semaglutide instructional dose string', () => {
    const raw = 'Semaglutide 2.4 mg subcutaneous once weekly';
    const out = redactDoseInstructionText(raw);
    expect(out.doseRedactionApplied).toBe(true);
    expect(out.redactionCount).toBeGreaterThan(0);
    expect(out.text).not.toMatch(/\b2\.4\s*mg\b/i);
    expect(out.text).not.toMatch(/once weekly/i);
    expect(assertNoDoseLexicon(out.text)).toBe(true);
  });

  it('keeps molecule name when redacting intervention label', () => {
    const name = redactInterventionName('Tirzepatide 15 mg');
    expect(name.toLowerCase()).toContain('tirzepatide');
    expect(name).not.toMatch(/\b15\s*mg\b/i);
  });

  it('deny-lists ICTRP search host in allowlist helper source', async () => {
    const { assertAllowlistScope, FALLBACK_ALLOWLIST_DOMAINS } = await import(
      '@/lib/agents/authorityAllowlist'
    );
    const blocked = assertAllowlistScope(
      'https://trialsearch.who.int/Trial2.aspx?TrialID=NCT123',
      [...FALLBACK_ALLOWLIST_DOMAINS],
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain('ictrp');
  });
});
