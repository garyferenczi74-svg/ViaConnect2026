/**
 * Prompt 226 Module C: Protocol Literacy curriculum.
 * Principles only. Zero compound-specific dose, frequency, or schedule values.
 * Owned by Thanos / presented by Hannah. Marshall-gated copy.
 */

export interface LiteracyLesson {
  id: string;
  number: number;
  title: string;
  summary: string;
  body: string[];
  /** Optional link into Module A for illustration with the user's own numbers. */
  converterIllustration?: boolean;
}

export const PROTOCOL_LITERACY_INTRO =
  'Protocol Literacy teaches concepts so you can talk with a licensed clinician. It does not recommend, suggest, or confirm any dose for any compound.';

/**
 * Twelve lessons from Prompt 226 Section 8.1.
 * Lexicon rule: no numeric mass/volume dose amounts; no prescribed schedules.
 */
export const PROTOCOL_LITERACY_LESSONS: readonly LiteracyLesson[] = [
  {
    id: 'reconstitution-concept',
    number: 1,
    title: 'What reconstitution is',
    summary:
      'Lyophilised powder and diluent are separate until mixed. The powder alone does not tell you what you will draw.',
    body: [
      'Many injectable peptides ship as a lyophilised (freeze-dried) powder in a vial. A liquid diluent is added later to dissolve that powder. That mixing step is called reconstitution.',
      'Until reconstitution happens, the powder does not define a draw volume on a syringe. Concentration only exists after a known amount of powder is dissolved in a known volume of diluent.',
      'This lesson explains the idea. It is not a technique guide and does not tell you how to inject.',
    ],
  },
  {
    id: 'concentration-is-the-game',
    number: 2,
    title: 'Concentration is the whole game',
    summary:
      'The same vial with different diluent volumes produces different unit readings for the same entered dose.',
    body: [
      'Concentration is amount of drug per millilitre after mixing. If the diluent volume changes, concentration changes, and the syringe units for the same entered dose change with it.',
      'That is why a unit conversion tool asks for vial amount, diluent volume, and the dose you already have from a prescriber. The tool does arithmetic on your numbers. It does not invent them.',
      'If you have saved conversions in the converter history, use those entries as your own illustration. Those numbers came from you, not from ViaConnect.',
    ],
    converterIllustration: true,
  },
  {
    id: 'syringe-standards',
    number: 3,
    title: 'Syringe standards: U-100 versus U-40',
    summary:
      'U-100 and U-40 mark different units per millilitre. Mixing them up is a major overdose risk.',
    body: [
      'Insulin-style syringes are commonly marked in units. A U-100 syringe is calibrated so that 100 units equal one millilitre. A U-40 syringe is calibrated so that 40 units equal one millilitre.',
      'Reading a U-100 calculated number on a U-40 barrel delivers two and a half times as much volume as intended. That interlock is the highest-value safety idea in the converter.',
      'Always confirm which standard you are physically holding before you trust any unit number. The converter asks for that confirmation on first use.',
    ],
  },
  {
    id: 'barrel-precision',
    number: 4,
    title: 'Barrel size and measurement precision',
    summary:
      'Very small volumes on a large barrel are hard to measure accurately.',
    body: [
      'Barrel size (for example 100u, 50u, or 30u) sets how much total capacity the syringe has and how finely the markings are spaced.',
      'When the calculated draw is only a tiny fraction of a large barrel, normal human measurement error becomes a large percentage of the intended amount. That is a real source of variability, not a rounding nuisance.',
      'The converter surfaces a precision warning when the computed units fall below a small threshold on a 100u barrel. It still does not tell you what dose to choose.',
    ],
  },
  {
    id: 'half-life-principle',
    number: 5,
    title: 'Half-life and frequency, as a principle',
    summary:
      'Half-life class in Collection 14 relates to how often compounds appear in the literature. It is pharmacology context, not a schedule.',
    body: [
      'Half-life describes how quickly levels of a substance tend to fall in the body. Collection 14 stores a half-life class for educational framing.',
      'In published research, compounds with shorter half-lives are often studied with more frequent administration than long-acting or depot forms. That pattern is observational context about study design.',
      'This lesson does not prescribe how often any compound should be taken. Frequency for a real regimen belongs to a licensed prescriber who knows your history.',
    ],
  },
  {
    id: 'timing-principles',
    number: 6,
    title: 'Timing principles',
    summary:
      'Some mechanisms interact with circadian rhythm, sleep, fasting, or exercise. That explains why timing questions exist.',
    body: [
      'Pharmacology sometimes cares about when a signal is present relative to sleep architecture, meal timing, or training stress. Those interactions are why clinicians ask timing questions.',
      'Educational monographs may note that timing questions exist for a pathway. They do not answer timing for a specific person or compound with a clock schedule.',
      'Bring timing questions to a licensed clinician. Do not treat an educational principle as a personal administration plan.',
    ],
  },
  {
    id: 'storage-stability',
    number: 7,
    title: 'Storage and stability',
    summary:
      'Lyophilised and reconstituted states behave differently. Temperature, light, and diluent choice affect shelf life.',
    body: [
      'Freeze-dried powder and mixed solution have different stability profiles. Heat, light, and time after mixing matter.',
      'Bacteriostatic diluent contains an agent intended to limit bacterial growth in a multi-draw vial. That label does not mean the mixture is sterile forever, and it does not remove infection risk from poor handling.',
      'Follow the storage guidance on the product you were prescribed and the instructions from your clinician or pharmacist. ViaConnect does not replace that guidance.',
    ],
  },
  {
    id: 'sterility-concepts',
    number: 8,
    title: 'Sterility and technique concepts',
    summary:
      'Aseptic handling matters because infection risk is real. This is risk awareness, not a how-to-inject guide.',
    body: [
      'Anything that crosses the skin into tissue can introduce bacteria if technique or surfaces are unclean. That is why clinicians talk about aseptic handling.',
      'Risk awareness includes understanding that shared vials, reused needles, and contaminated surfaces raise infection risk. Those are concepts, not step-by-step instructions.',
      'ViaConnect does not teach injection technique. Ask a licensed clinician or pharmacist for hands-on instruction if you have been prescribed an injectable.',
    ],
  },
  {
    id: 'fixed-blends',
    number: 9,
    title: 'Why fixed blends have no established dose',
    summary:
      'Stacks and fixed blends are rarely studied as combinations, so component doses are not validated in that context.',
    body: [
      'Collection 14 tracks educational stack relationships carefully. A blend marketed as a stack is not the same thing as a combination that completed controlled human trials together.',
      'When components are mixed without combination evidence, there is no established dose for the blend as a single product. Each component also still lacks a platform-authored dose.',
      'Treat blend marketing claims as marketing until a clinician and the evidence say otherwise.',
    ],
  },
  {
    id: 'no-established-dose',
    number: 10,
    title: 'Why no established dose is a real answer',
    summary:
      'For much of Collection 14 there is no human dose-finding data. The absence of a number is information.',
    body: [
      'An established dose usually means human studies defined a range with some understanding of benefit and risk. Many educational peptides never reached that stage.',
      'When ViaConnect says no established dose exists for a compound, that is why the converter will not offer conversion for research-chemical or unverified rows.',
      'Guessing a number to fill the silence is how people get hurt. The honest educational move is to stop at the evidence and talk to a clinician.',
    ],
  },
  {
    id: 'read-evidence-layer',
    number: 11,
    title: 'How to read the evidence layer',
    summary:
      'Registration is not completion. Completion is not publication. Publication is not a positive result.',
    body: [
      'Prompt 225a honesty-layer counts separate registered trials, completed trials, posted results, and human publications.',
      'A trial can be registered and never finish. A completed trial can withhold results. A published paper can report a negative or mixed outcome.',
      'Use those distinctions when you read monograph evidence grades and honesty statements. Do not collapse them into a single yes-or-no claim.',
    ],
  },
  {
    id: 'clinician-conversation',
    number: 12,
    title: 'How to have this conversation with a clinician',
    summary:
      'Bring your questions, your history, and your own converter inputs if you have them. Ask for a real regimen if one is appropriate.',
    body: [
      'Useful materials for a visit include your medication list, allergies, relevant labs, and any educational notes you want clarified. If you used the converter, bring the inputs you typed and the unit result it produced from those inputs.',
      'Ask whether a licensed regimen is appropriate for you, which syringe standard to use, and how monitoring should work. Those answers are clinical judgment.',
      'ViaConnect can educate and convert numbers you already have. It cannot replace a prescriber, and it will not invent a dose to make the conversation easier.',
    ],
  },
];

/** Patterns that must not appear in Module C lesson text. */
export const LITERACY_DOSE_LEXICON =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|iu)\b|\b(?:once|twice|thrice)\s+(?:daily|weekly|monthly)\b|\bevery\s+\d+\s*(?:hours?|days?|weeks?)\b|\b(?:take|inject|draw)\s+\d+/i;

export function literacyLexiconHits(text: string): string[] {
  const hits: string[] = [];
  const re = new RegExp(LITERACY_DOSE_LEXICON.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    hits.push(m[0]);
  }
  return hits;
}

export function assertLiteracyCorpusClean(
  lessons: readonly LiteracyLesson[] = PROTOCOL_LITERACY_LESSONS,
): string[] {
  const failures: string[] = [];
  for (const lesson of lessons) {
    const blob = [lesson.title, lesson.summary, ...lesson.body].join('\n');
    const hits = literacyLexiconHits(blob);
    for (const h of hits) {
      failures.push(`${lesson.id}: lexicon hit "${h}"`);
    }
  }
  return failures;
}
