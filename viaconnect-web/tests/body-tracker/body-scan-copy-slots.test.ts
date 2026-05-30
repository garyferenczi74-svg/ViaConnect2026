// Guard tests for body-scan-copy-slots.ts (Prompt #169b, Task 16).
//
// The legally + clinically sensitive wording for biometric consent (section 2)
// and the disordered-eating safeguard (section 3) is counsel/clinician-gated and
// is NOT finalized in this task. Every user-facing string is a clearly-marked
// PLACEHOLDER slot. These tests assert that:
//   1. every slot STILL reads as a placeholder (nobody pasted real legal/crisis
//      copy into the scaffold without removing the guard), and
//   2. no slot contains an em/en dash (standing rule: no dashes in UI copy).
//
// When approved copy is dropped in later (a separate, gated change), these
// guards are updated in the SAME change that removes the placeholder prefix.

import { describe, it, expect } from 'vitest';
import {
  COPY_SLOT_PLACEHOLDER_PREFIX,
  CONSENT_SECTION_SLOTS,
  CONSENT_SCREEN_TITLE_SLOT,
  CONSENT_SCREEN_INTRO_SLOT,
  CONSENT_ACCEPT_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_BODY_SLOT,
  DISORDERED_EATING_QUESTION_PROMPT_SLOT,
  DISORDERED_EATING_OPTION_SLOTS,
  DISORDERED_EATING_PRIVACY_NOTE_SLOT,
  RESOURCE_CARD_TITLE_SLOT,
  RESOURCE_CARD_BODY_SLOT,
  RESOURCE_CARD_DISMISS_LABEL_SLOT,
  HELPLINE_CONTACT_SLOT,
} from '@/lib/body-tracker/body-scan-copy-slots';

// Every user-facing string slot in the module, flattened.
const ALL_SLOT_STRINGS: string[] = [
  CONSENT_SCREEN_TITLE_SLOT,
  CONSENT_SCREEN_INTRO_SLOT,
  CONSENT_ACCEPT_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_BODY_SLOT,
  DISORDERED_EATING_QUESTION_PROMPT_SLOT,
  DISORDERED_EATING_PRIVACY_NOTE_SLOT,
  RESOURCE_CARD_TITLE_SLOT,
  RESOURCE_CARD_BODY_SLOT,
  RESOURCE_CARD_DISMISS_LABEL_SLOT,
  ...CONSENT_SECTION_SLOTS.flatMap((s) => [s.headingSlot, s.bodySlot]),
  ...DISORDERED_EATING_OPTION_SLOTS.map((o) => o.labelSlot),
  HELPLINE_CONTACT_SLOT.nameSlot,
  HELPLINE_CONTACT_SLOT.phoneSlot,
  HELPLINE_CONTACT_SLOT.hoursSlot,
  HELPLINE_CONTACT_SLOT.urlSlot,
  HELPLINE_CONTACT_SLOT.ctaLabelSlot,
];

describe('body-scan copy slots are all placeholders (counsel/clinician-gated)', () => {
  it('every slot string starts with the placeholder marker', () => {
    for (const s of ALL_SLOT_STRINGS) {
      expect(typeof s).toBe('string');
      expect(s.startsWith(COPY_SLOT_PLACEHOLDER_PREFIX)).toBe(true);
    }
  });

  it('there are slots for all seven consent sections (section 2.2.1)', () => {
    const ids = CONSENT_SECTION_SLOTS.map((s) => s.id);
    expect(ids).toEqual([
      'what_is_collected',
      'what_is_not_collected',
      'purposes',
      'retention_schedule',
      'destruction',
      'no_sale',
      'practitioner_share',
    ]);
  });

  it('there are exactly four disordered-eating option slots with the fixed machine values', () => {
    expect(DISORDERED_EATING_OPTION_SLOTS.map((o) => o.value)).toEqual([
      'currently',
      'in_the_past',
      'no',
      'prefer_not_to_say',
    ]);
  });

  it('no slot contains an em dash or en dash (standing no-dashes rule)', () => {
    for (const s of ALL_SLOT_STRINGS) {
      expect(s.includes('—')).toBe(false); // em dash
      expect(s.includes('–')).toBe(false); // en dash
    }
  });

  it('the helpline contact is a single slot object, all parts placeholder-marked', () => {
    expect(HELPLINE_CONTACT_SLOT.nameSlot.startsWith(COPY_SLOT_PLACEHOLDER_PREFIX)).toBe(true);
    expect(HELPLINE_CONTACT_SLOT.phoneSlot.startsWith(COPY_SLOT_PLACEHOLDER_PREFIX)).toBe(true);
    expect(HELPLINE_CONTACT_SLOT.ctaLabelSlot.startsWith(COPY_SLOT_PLACEHOLDER_PREFIX)).toBe(true);
  });
});
