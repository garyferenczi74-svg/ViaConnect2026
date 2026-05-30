// =============================================================================
// Body Scan: COPY SLOTS for legally + clinically sensitive wording.
// (Prompt #169b, Task 16, spec section 2 biometric consent + section 3
// disordered-eating safeguard.)
//
// WHY THIS FILE EXISTS
//   The MECHANISMS for biometric consent (section 2) and the disordered-eating
//   safeguard (section 3) are P0 and are built now. The WORDING is not: every
//   user-facing legal, crisis, helpline, and onboarding string here is gated on
//   Gary's counsel and a qualified clinician. This module centralizes those
//   strings as clearly-marked PLACEHOLDER slots so the components can be wired,
//   reviewed, and tested today, and the final copy can be dropped in (and only
//   here) once it is approved.
//
//   EVERY exported string in this file is a placeholder. None of it is final
//   legal or crisis copy. Each slot carries an explicit
//     // TODO(counsel): ...     (legal / consent / retention wording), or
//     // TODO(clinician): ...    (crisis / helpline / disordered-eating wording)
//   marker describing what approved copy must replace it.
//
//   The placeholders are deliberately written to READ as placeholders (the
//   "[PLACEHOLDER ...]" prefix) so that an un-replaced slot is obvious in the UI
//   during review and can never be mistaken for shipped copy. A predelivery
//   guard test (tests/body-tracker/body-scan-copy-slots.test.ts) asserts the
//   PLACEHOLDER marker is still present, i.e. that nobody has quietly pasted
//   real legal/crisis copy into this scaffold without removing the guard.
//
//   Do NOT write final legal or crisis copy in this file under any circumstances
//   in this task. Replacement is a separate, counsel-and-clinician-gated step.
// =============================================================================

// A stable, machine-recognizable marker every placeholder slot begins with. The
// guard test keys off this exact prefix. When real copy is dropped in, this
// prefix is removed as part of the same approved change.
export const COPY_SLOT_PLACEHOLDER_PREFIX = '[PLACEHOLDER';

// -----------------------------------------------------------------------------
// SECTION 2: biometric-consent copy slots (counsel-gated).
// -----------------------------------------------------------------------------
// The consent screen (BodyScanConsentScreen) renders these as distinct,
// individually-acknowledgeable sections. The mechanism (which sections exist,
// the retention selector, the granular model-improvement opt-in, and the
// append-only write) is fixed; only the wording is a slot.

export interface ConsentSectionSlot {
  // Stable id used as a React key and as an analytics/section anchor. NOT copy.
  id: string;
  // Placeholder heading. TODO(counsel) below the object describes the real copy.
  headingSlot: string;
  // Placeholder body. TODO(counsel) below the object describes the real copy.
  bodySlot: string;
}

// The seven consent sections the spec (section 2.2.1) requires the screen to
// present. Headings/bodies are placeholders only.
export const CONSENT_SECTION_SLOTS: readonly ConsentSectionSlot[] = [
  {
    id: 'what_is_collected',
    // TODO(counsel): exact wording for WHAT biometric data the Body Scan
    // collects (photographs, derived measurements, body-composition estimates,
    // pose keypoints, camera metadata). Plain-language, enumerated.
    headingSlot: '[PLACEHOLDER consent heading: what we collect]',
    bodySlot:
      '[PLACEHOLDER consent body: enumerate the biometric data the Body Scan collects. Counsel-approved wording required before launch.]',
  },
  {
    id: 'what_is_not_collected',
    // TODO(counsel): exact wording for what is explicitly NOT collected or
    // retained (e.g. raw imagery beyond the retention window, any data outside
    // the enumerated set).
    headingSlot: '[PLACEHOLDER consent heading: what we do not collect]',
    bodySlot:
      '[PLACEHOLDER consent body: state what the Body Scan does NOT collect or keep. Counsel-approved wording required.]',
  },
  {
    id: 'purposes',
    // TODO(counsel): the specific, limited purposes the biometric data is used
    // for (your results, trends over time, your practitioner if you share).
    headingSlot: '[PLACEHOLDER consent heading: how we use it]',
    bodySlot:
      '[PLACEHOLDER consent body: enumerate the limited purposes of processing. Counsel-approved wording required.]',
  },
  {
    id: 'retention_schedule',
    // TODO(counsel): the retention schedule and how the user's retention
    // preference (0 / 30 / 90 / 365 / indefinite) maps to what is kept and for
    // how long. Must agree with the retention selector options below.
    headingSlot: '[PLACEHOLDER consent heading: how long we keep it]',
    bodySlot:
      '[PLACEHOLDER consent body: describe the retention schedule and the user-selectable retention window. Counsel-approved wording required.]',
  },
  {
    id: 'destruction',
    // TODO(counsel): how and when data is destroyed at the end of the retention
    // window or on withdrawal of consent, and how to request destruction.
    headingSlot: '[PLACEHOLDER consent heading: deletion and destruction]',
    bodySlot:
      '[PLACEHOLDER consent body: describe destruction at end of retention / on withdrawal, and how to request it. Counsel-approved wording required.]',
  },
  {
    id: 'no_sale',
    // TODO(counsel): the affirmative no-sale / no-broker commitment for
    // biometric data.
    headingSlot: '[PLACEHOLDER consent heading: we do not sell your data]',
    bodySlot:
      '[PLACEHOLDER consent body: affirmative no-sale commitment for biometric data. Counsel-approved wording required.]',
  },
  {
    id: 'practitioner_share',
    // TODO(counsel): when and how scan data may be shared with the user's own
    // practitioner, and that this is under the user's control.
    headingSlot: '[PLACEHOLDER consent heading: sharing with your practitioner]',
    bodySlot:
      '[PLACEHOLDER consent body: describe user-controlled practitioner sharing. Counsel-approved wording required.]',
  },
] as const;

// The granular, default-OFF model-improvement opt-in (section 2.2.1). This is a
// SEPARATE acknowledgement from accepting the consent itself; it must be turned
// on actively and is never bundled into the main accept.
// TODO(counsel): final wording for the model-improvement opt-in, including that
// it is optional, off by default, and revocable, and what "model improvement"
// concretely means for the user's de-identified scan data.
export const MODEL_IMPROVEMENT_OPT_IN_LABEL_SLOT =
  '[PLACEHOLDER opt-in label: help improve the model (optional, off by default)]';
export const MODEL_IMPROVEMENT_OPT_IN_BODY_SLOT =
  '[PLACEHOLDER opt-in body: explain the optional, default-off, revocable model-improvement opt-in. Counsel-approved wording required.]';

// The primary accept action + the screen's title/intro. Placeholders.
// TODO(counsel): final consent screen title, intro paragraph, and the exact
// label of the affirmative accept control (the click that records consent).
export const CONSENT_SCREEN_TITLE_SLOT = '[PLACEHOLDER consent title]';
export const CONSENT_SCREEN_INTRO_SLOT =
  '[PLACEHOLDER consent intro: one short paragraph framing the biometric-consent screen. Counsel-approved wording required.]';
export const CONSENT_ACCEPT_LABEL_SLOT = '[PLACEHOLDER consent accept button label]';

// -----------------------------------------------------------------------------
// SECTION 3: disordered-eating-safeguard copy slots (clinician-gated).
// -----------------------------------------------------------------------------

// The one-screen, four-option question shown before the educational walkthrough
// on first Body Scan open (section 3.2.1). The four MACHINE values are fixed
// (they drive the response-adaptive defaults); only the prompt and the option
// LABELS are clinician-gated slots.
// TODO(clinician): final, sensitively-worded prompt for the disordered-eating
// history question, and the labels for the four options. Wording must be
// reviewed by a qualified clinician; it must be non-stigmatizing and must make
// "prefer not to say" feel equally safe.
export const DISORDERED_EATING_QUESTION_PROMPT_SLOT =
  '[PLACEHOLDER question prompt: sensitively-worded disordered-eating history question. Clinician-approved wording required.]';

export interface DisorderedEatingOptionSlot {
  // Stable machine value persisted to the profile + read by the adaptive-default
  // mapping. NOT copy; do not change without updating the mapping + migration.
  value: 'currently' | 'in_the_past' | 'no' | 'prefer_not_to_say';
  // Placeholder option label.
  labelSlot: string;
}

export const DISORDERED_EATING_OPTION_SLOTS: readonly DisorderedEatingOptionSlot[] = [
  // TODO(clinician): label for the "currently experiencing" option.
  { value: 'currently', labelSlot: '[PLACEHOLDER option: currently]' },
  // TODO(clinician): label for the "in the past" option.
  { value: 'in_the_past', labelSlot: '[PLACEHOLDER option: in the past]' },
  // TODO(clinician): label for the "no" option.
  { value: 'no', labelSlot: '[PLACEHOLDER option: no]' },
  // TODO(clinician): label for the "prefer not to say" option.
  { value: 'prefer_not_to_say', labelSlot: '[PLACEHOLDER option: prefer not to say]' },
] as const;

// Supporting microcopy around the question (why we ask, that it is private and
// never shown to practitioners, that it can be skipped). Placeholders.
// TODO(clinician) + TODO(counsel): the "why we ask + privacy" microcopy. It
// must accurately state that the answer is private, encrypted at rest, never
// shown to practitioners, and only used to tune the user's own experience.
export const DISORDERED_EATING_PRIVACY_NOTE_SLOT =
  '[PLACEHOLDER privacy note: explain why we ask, that the answer is private + encrypted + never shown to practitioners, and that it only tunes your own experience. Clinician + counsel approved wording required.]';

// The non-intrusive support resource card (section 3.2.5). This card shows ONLY
// an informational message + a professional-support pointer + the helpline
// contact. NO specific guidance, NO numbers, NO step-by-step.
// TODO(clinician): final, non-prescriptive wording for the support resource
// card title + body. Informational and supportive only; explicitly NOT advice,
// NOT a diagnosis, and NOT step-by-step guidance.
export const RESOURCE_CARD_TITLE_SLOT = '[PLACEHOLDER resource card title]';
export const RESOURCE_CARD_BODY_SLOT =
  '[PLACEHOLDER resource card body: brief, supportive, non-prescriptive message pointing toward professional support. No guidance, no numbers, no steps. Clinician-approved wording required.]';
export const RESOURCE_CARD_DISMISS_LABEL_SLOT = '[PLACEHOLDER resource card dismiss label]';

// The helpline / crisis contact. Per the task, this may be a SINGLE config
// constant slot (also TODO-marked for confirmation). The National Alliance for
// Eating Disorders is named as the intended source, but the EXACT contact
// details, hours, and the call-to-action wording must be confirmed.
// TODO(clinician): confirm the National Alliance for Eating Disorders helpline
// contact details (display name, phone, hours, URL) and the exact, approved
// call-to-action wording. Do not ship unconfirmed contact details.
export interface HelplineContactSlot {
  // Display name of the helpline organization (placeholder pending confirmation).
  nameSlot: string;
  // Phone number (placeholder pending confirmation). Empty until confirmed.
  phoneSlot: string;
  // Hours-of-operation line (placeholder pending confirmation).
  hoursSlot: string;
  // URL (placeholder pending confirmation). Empty until confirmed.
  urlSlot: string;
  // The approved call-to-action label (placeholder pending confirmation).
  ctaLabelSlot: string;
}

export const HELPLINE_CONTACT_SLOT: HelplineContactSlot = {
  nameSlot: '[PLACEHOLDER helpline name: National Alliance for Eating Disorders (confirm)]',
  phoneSlot: '[PLACEHOLDER helpline phone: confirm before launch]',
  hoursSlot: '[PLACEHOLDER helpline hours: confirm before launch]',
  urlSlot: '[PLACEHOLDER helpline url: confirm before launch]',
  ctaLabelSlot: '[PLACEHOLDER helpline cta: confirm before launch]',
};
