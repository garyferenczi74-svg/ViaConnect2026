/**
 * Prompt 225a Wave 1 flagship compounds and query expansion terms.
 */

export interface Wave1Compound {
  slug: string;
  display: string;
  terms: Array<{ term: string; termSource: Wave1TermSource }>;
}

export type Wave1TermSource =
  | 'canonical'
  | 'inn'
  | 'trade_name'
  | 'code_name'
  | 'community_name'
  | 'sequence_descriptor';

/** Ten+ flagships from 225a Appendix B mapped to Collection 14 slugs. */
export const WAVE1_COMPOUNDS: readonly Wave1Compound[] = [
  {
    slug: 'retatrutide',
    display: 'Retatrutide',
    terms: [
      { term: 'retatrutide', termSource: 'canonical' },
      { term: 'LY3437943', termSource: 'code_name' },
    ],
  },
  {
    // Collection 14 has liraglutide; semaglutide terms still queried for redaction proof
    // and linked when intervention names match closely. Primary CT.gov term: liraglutide.
    slug: 'liraglutide',
    display: 'Liraglutide / GLP-1 class',
    terms: [
      { term: 'liraglutide', termSource: 'canonical' },
      { term: 'semaglutide', termSource: 'community_name' },
      { term: 'Victoza', termSource: 'trade_name' },
      { term: 'Saxenda', termSource: 'trade_name' },
      { term: 'Ozempic', termSource: 'trade_name' },
      { term: 'Wegovy', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'setmelanotide',
    display: 'Setmelanotide',
    terms: [
      { term: 'setmelanotide', termSource: 'canonical' },
      { term: 'RM-493', termSource: 'code_name' },
      { term: 'Imcivree', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'afamelanotide',
    display: 'Afamelanotide',
    terms: [
      { term: 'afamelanotide', termSource: 'canonical' },
      { term: 'melanotan-1', termSource: 'community_name' },
      { term: 'CUV1647', termSource: 'code_name' },
      { term: 'Scenesse', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'teduglutide',
    display: 'Teduglutide',
    terms: [
      { term: 'teduglutide', termSource: 'canonical' },
      { term: 'ALX-0600', termSource: 'code_name' },
      { term: 'Gattex', termSource: 'trade_name' },
      { term: 'Revestive', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'pt-141-bremelanotide',
    display: 'Bremelanotide',
    terms: [
      { term: 'bremelanotide', termSource: 'inn' },
      { term: 'PT-141', termSource: 'code_name' },
      { term: 'PT141', termSource: 'code_name' },
      { term: 'Vyleesi', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'edu-ss31',
    display: 'Elamipretide / SS-31',
    terms: [
      { term: 'elamipretide', termSource: 'inn' },
      { term: 'SS-31', termSource: 'code_name' },
      { term: 'MTP-131', termSource: 'code_name' },
      { term: 'Bendavia', termSource: 'trade_name' },
    ],
  },
  {
    slug: 'edu-bpc157',
    display: 'BPC-157',
    terms: [
      { term: 'BPC-157', termSource: 'canonical' },
      { term: 'BPC157', termSource: 'community_name' },
      { term: 'PL-14736', termSource: 'code_name' },
    ],
  },
  {
    slug: 'ipamorelin-standalone',
    display: 'Ipamorelin',
    terms: [
      { term: 'ipamorelin', termSource: 'canonical' },
      { term: 'NNC 26-0161', termSource: 'code_name' },
    ],
  },
  {
    slug: 'cjc-1295-no-dac',
    display: 'CJC-1295',
    terms: [
      { term: 'CJC-1295', termSource: 'canonical' },
      { term: 'modified GRF 1-29', termSource: 'community_name' },
    ],
  },
];

/** Low-precision terms that must stay inactive for intervention search. */
export const WAVE1_DEACTIVATED_TERMS = [
  'GHK',
  'TB-500',
  'Selank',
  'P21',
  'Klotho',
] as const;
