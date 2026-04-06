/**
 * Ultrathink Pattern Detection Engine — 10 Functional Medicine Patterns
 * Reads CAQ symptom scores, lifestyle, goals, and health concerns
 * to detect clinical patterns that drive peptide recommendations.
 */

import { UltrathinkContext, SymptomEntry } from './buildContext';

export interface DetectedPattern {
  id: string;
  label: string;
  sublabel: string;
  confidence: number;
  signals: string[];
  color: string;
  icon: string;
}

// Helper to get symptom score from context
function getScore(syms: Record<string, SymptomEntry>, ...keys: string[]): number {
  for (const k of keys) {
    if (syms[k]?.score !== undefined) return syms[k].score;
  }
  return 0;
}

function hasGoal(ctx: UltrathinkContext, ...keywords: string[]): boolean {
  return ctx.goals.some(g => keywords.some(k => g.toLowerCase().includes(k.toLowerCase())));
}

function hasConcern(ctx: UltrathinkContext, ...keywords: string[]): boolean {
  return ctx.healthConcerns.some(c => keywords.some(k => c.toLowerCase().includes(k.toLowerCase())));
}

function hasFamilyHistory(ctx: UltrathinkContext, ...keywords: string[]): boolean {
  return ctx.familyHistory.some(f => keywords.some(k => (f.condition || '').toLowerCase().includes(k.toLowerCase())));
}

export function detectPatterns(ctx: UltrathinkContext): DetectedPattern[] {
  const detected: DetectedPattern[] = [];
  const phys = ctx.physicalSymptoms;
  const neuro = ctx.neuroSymptoms;
  const emo = ctx.emotionalSymptoms;
  const ls = ctx.lifestyle;

  // 1. HPA AXIS DYSREGULATION
  {
    const signals: string[] = [];
    let score = 0;
    if (ls.stressLevel === 'High' || ls.stressLevel === 'Very High') { score += 0.25; signals.push(`Stress: ${ls.stressLevel}`); }
    if (parseFloat(ls.sleepHours || '8') < 6) { score += 0.15; signals.push(`Sleep deprivation (${ls.sleepHours}h)`); }
    if (getScore(phys, 'fatigue') >= 5) { score += 0.15; signals.push(`Fatigue: ${getScore(phys, 'fatigue')}/10`); }
    if (getScore(emo, 'anxiety') >= 5) { score += 0.15; signals.push(`Anxiety: ${getScore(emo, 'anxiety')}/10`); }
    if (getScore(emo, 'stress') >= 5) { score += 0.15; signals.push(`Stress symptoms: ${getScore(emo, 'stress')}/10`); }
    if (getScore(emo, 'irritability') >= 5) { score += 0.10; signals.push('Irritability'); }
    if (hasGoal(ctx, 'Reduce Stress')) { score += 0.10; signals.push('Goal: Reduce Stress'); }
    if (score >= 0.4) detected.push({ id: 'hpa_axis', label: 'HPA Axis Dysregulation', sublabel: 'Cortisol & Adrenal Stress Response', confidence: Math.min(score, 1.0), signals, color: 'orange', icon: 'Activity' });
  }

  // 2. NEUROINFLAMMATION
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(neuro, 'brain_fog') >= 4) { score += 0.25; signals.push(`Brain fog: ${getScore(neuro, 'brain_fog')}/10`); }
    if (getScore(neuro, 'memory') >= 4) { score += 0.20; signals.push(`Memory issues: ${getScore(neuro, 'memory')}/10`); }
    if (getScore(neuro, 'focus') >= 4) { score += 0.15; signals.push(`Focus issues: ${getScore(neuro, 'focus')}/10`); }
    if (getScore(phys, 'headache') >= 4) { score += 0.15; signals.push(`Headaches: ${getScore(phys, 'headache')}/10`); }
    if (hasConcern(ctx, 'cognitive', 'dementia')) { score += 0.20; signals.push('Cognitive health concern'); }
    if (hasFamilyHistory(ctx, 'alzheimer', 'dementia')) { score += 0.20; signals.push('Family: neurodegenerative'); }
    if (hasGoal(ctx, 'Sharpen Cognition')) { score += 0.10; signals.push('Goal: Sharpen Cognition'); }
    if (score >= 0.4) detected.push({ id: 'neuroinflammation', label: 'Neuroinflammation Pattern', sublabel: 'CNS Inflammatory Burden', confidence: Math.min(score, 1.0), signals, color: 'purple', icon: 'Brain' });
  }

  // 3. GUT-BRAIN AXIS
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(phys, 'digestive') >= 4) { score += 0.25; signals.push(`Digestive issues: ${getScore(phys, 'digestive')}/10`); }
    if (hasConcern(ctx, 'IBS', 'bloating', 'GERD', 'leaky gut', 'gut')) { score += 0.20; signals.push('GI health concern'); }
    if (getScore(phys, 'digestive') >= 4 && getScore(neuro, 'brain_fog') >= 4) { score += 0.20; signals.push('Gut-brain fog co-occurrence'); }
    if (hasGoal(ctx, 'Improve Digestion')) { score += 0.10; signals.push('Goal: Improve Digestion'); }
    if (hasConcern(ctx, 'autoimmune')) { score += 0.15; signals.push('Autoimmune concern'); }
    if (score >= 0.4) detected.push({ id: 'gut_brain_axis', label: 'Gut-Brain Axis Disruption', sublabel: 'Microbiome & Intestinal Permeability', confidence: Math.min(score, 1.0), signals, color: 'green', icon: 'Workflow' });
  }

  // 4. METABOLIC DYSREGULATION
  {
    const signals: string[] = [];
    let score = 0;
    if (ctx.demographics.bmi && ctx.demographics.bmi > 27) { score += 0.20; signals.push(`BMI ${ctx.demographics.bmi.toFixed(1)}`); }
    if (hasConcern(ctx, 'diabetes', 'prediabetes', 'insulin')) { score += 0.30; signals.push('Metabolic concern'); }
    if (hasConcern(ctx, 'PCOS')) { score += 0.25; signals.push('PCOS'); }
    if (getScore(phys, 'weight') >= 4) { score += 0.15; signals.push(`Weight issues: ${getScore(phys, 'weight')}/10`); }
    if (hasGoal(ctx, 'Lose Weight')) { score += 0.15; signals.push('Goal: Lose Weight'); }
    if (ls.exercise === 'Rarely' || ls.exercise === '1-2x/week') { score += 0.10; signals.push(`Low exercise: ${ls.exercise}`); }
    if (score >= 0.4) detected.push({ id: 'metabolic_dysregulation', label: 'Metabolic Dysregulation', sublabel: 'Insulin Resistance & Energy Metabolism', confidence: Math.min(score, 1.0), signals, color: 'yellow', icon: 'Zap' });
  }

  // 5. TISSUE REPAIR
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(phys, 'pain') >= 4) { score += 0.25; signals.push(`Pain: ${getScore(phys, 'pain')}/10`); }
    if (hasConcern(ctx, 'arthritis', 'joint', 'tendon', 'injury', 'fibromyalgia')) { score += 0.25; signals.push('Joint/tissue concern'); }
    if (hasGoal(ctx, 'Joint', 'Mobility')) { score += 0.15; signals.push('Goal: Joint & Mobility'); }
    if (hasGoal(ctx, 'Build Muscle')) { score += 0.10; signals.push('Goal: Build Muscle'); }
    if (getScore(phys, 'skin') >= 4) { score += 0.10; signals.push('Skin issues'); }
    if (score >= 0.4) detected.push({ id: 'tissue_repair', label: 'Tissue Repair & Recovery Deficit', sublabel: 'Musculoskeletal & Connective Tissue', confidence: Math.min(score, 1.0), signals, color: 'red', icon: 'Wrench' });
  }

  // 6. IMMUNE DYSREGULATION
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(emo, 'immune') >= 4) { score += 0.20; signals.push(`Immune issues: ${getScore(emo, 'immune')}/10`); }
    if (getScore(emo, 'inflammation') >= 4) { score += 0.20; signals.push(`Inflammation: ${getScore(emo, 'inflammation')}/10`); }
    if (hasConcern(ctx, 'autoimmune', 'frequent infections', 'immune')) { score += 0.30; signals.push('Immune health concern'); }
    if (hasFamilyHistory(ctx, 'autoimmune')) { score += 0.15; signals.push('Family: autoimmune'); }
    if (score >= 0.4) detected.push({ id: 'immune_dysregulation', label: 'Immune System Dysregulation', sublabel: 'Inflammatory & Autoimmune Burden', confidence: Math.min(score, 1.0), signals, color: 'teal', icon: 'Shield' });
  }

  // 7. HORMONAL IMBALANCE
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(emo, 'hormonal') >= 4) { score += 0.25; signals.push(`Hormonal symptoms: ${getScore(emo, 'hormonal')}/10`); }
    if (hasConcern(ctx, 'menopause', 'perimenopause', 'low testosterone', 'infertility', 'PCOS')) { score += 0.30; signals.push('Hormonal concern'); }
    if (hasGoal(ctx, 'Hormonal Balance')) { score += 0.15; signals.push('Goal: Hormonal Balance'); }
    if (getScore(emo, 'hair_nail') >= 4) { score += 0.10; signals.push('Hair/nail changes'); }
    if (score >= 0.4) detected.push({ id: 'hormonal_imbalance', label: 'Hormonal Imbalance', sublabel: 'Sex Hormones & Growth Hormone Axis', confidence: Math.min(score, 1.0), signals, color: 'pink', icon: 'Sigma' });
  }

  // 8. CIRCADIAN/SLEEP DISRUPTION
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(neuro, 'sleep_quality') >= 5) { score += 0.25; signals.push(`Sleep quality: ${getScore(neuro, 'sleep_quality')}/10`); }
    if (getScore(neuro, 'sleep_onset') >= 5) { score += 0.20; signals.push(`Sleep onset: ${getScore(neuro, 'sleep_onset')}/10`); }
    if (parseFloat(ls.sleepHours || '8') < 6.5) { score += 0.20; signals.push(`Short sleep: ${ls.sleepHours}h`); }
    if (hasGoal(ctx, 'Improve Sleep')) { score += 0.15; signals.push('Goal: Improve Sleep'); }
    if (ls.caffeine === 'Heavy') { score += 0.10; signals.push('Heavy caffeine'); }
    if (score >= 0.4) detected.push({ id: 'circadian_disruption', label: 'Circadian & Sleep Disruption', sublabel: 'Pineal-Melatonin-Sleep Architecture', confidence: Math.min(score, 1.0), signals, color: 'indigo', icon: 'Moon' });
  }

  // 9. LONGEVITY/AGING
  {
    const signals: string[] = [];
    let score = 0;
    if (hasGoal(ctx, 'Anti-Aging', 'Longevity')) { score += 0.25; signals.push('Goal: Anti-Aging'); }
    if ((ctx.demographics.age ?? 0) > 45) { score += 0.15; signals.push(`Age ${ctx.demographics.age}`); }
    if (hasFamilyHistory(ctx, 'alzheimer', 'cancer', 'heart disease', 'diabetes')) { score += 0.20; signals.push('High-risk family history'); }
    if (hasConcern(ctx, 'aging', 'longevity')) { score += 0.20; signals.push('Aging concern'); }
    if (score >= 0.4) detected.push({ id: 'longevity_aging', label: 'Accelerated Biological Aging', sublabel: 'Epigenetic Age & Cellular Senescence', confidence: Math.min(score, 1.0), signals, color: 'amber', icon: 'Hourglass' });
  }

  // 10. AUTONOMIC DYSREGULATION
  {
    const signals: string[] = [];
    let score = 0;
    if (getScore(phys, 'cardiovascular') >= 4) { score += 0.20; signals.push(`Cardiovascular: ${getScore(phys, 'cardiovascular')}/10`); }
    if (getScore(emo, 'anxiety') >= 6 && ls.stressLevel === 'High') { score += 0.25; signals.push('Anxiety + high stress co-pattern'); }
    if (hasConcern(ctx, 'POTS', 'dysautonomia', 'palpitations')) { score += 0.35; signals.push('Autonomic concern'); }
    if (getScore(phys, 'respiratory') >= 4) { score += 0.10; signals.push('Respiratory symptoms'); }
    if (score >= 0.4) detected.push({ id: 'autonomic_dysregulation', label: 'Autonomic Nervous System Dysregulation', sublabel: 'Sympathetic Dominance & HRV Suppression', confidence: Math.min(score, 1.0), signals, color: 'sky', icon: 'Waves' });
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}
