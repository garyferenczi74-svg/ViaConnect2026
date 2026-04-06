/**
 * ViaConnect Interaction Rules Generator
 * Run ONCE: npx tsx scripts/generate-interaction-rules.ts
 * Generates comprehensive interaction rules for all FarmCeutica products.
 * Uses Claude Code subscription — zero runtime cost after generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const DRUG_CLASSES = [
  'warfarin', 'SSRI', 'SNRI', 'MAOI', 'TCA', 'antipsychotic',
  'ACE inhibitor', 'ARB', 'beta-blocker', 'calcium channel blocker',
  'statin', 'metformin', 'sulfonylurea', 'GLP-1 agonist', 'insulin',
  'levothyroxine', 'proton pump inhibitor', 'H2 blocker',
  'immunosuppressant', 'corticosteroid', 'NSAIDs', 'aspirin',
  'LMWH', 'DOAC', 'lithium', 'anticonvulsant', 'benzodiazepine',
  'opioid', 'bisphosphonate', 'diuretic', 'digoxin',
];

const FARMCEUTICA_PRODUCTS = [
  'RELAX+ Sleep Support', 'NeuroCalm+', 'FOCUS+ Nootropic Formula',
  'Replenish NAD+', 'Balance+ Gut Repair', 'FLEX+ Joint & Inflammation',
  'IRON+ Red Blood Cell Support', 'GLP-1 Activator Complex',
  'RISE+ Male Testosterone', 'BLAST+ Nitric Oxide Stack',
  'Clean+ Detox & Liver Health', 'Teloprime+ Telomere Support',
  'CATALYST+ Energy Multivitamin', 'Magnesium Synergy Matrix',
  'MTHFR+ Folate Metabolism', 'COMT+ Neurotransmitter Balance',
  'VDR+ Receptor Activation', 'DAO+ Histamine Balance',
  'Grow+ Pre-Natal Formula', 'NOS+ Vascular Integrity',
];

async function generateRulesForPair(drug: string, product: string): Promise<any[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a clinical pharmacist. Drug/class: "${drug}" | Product: "${product}"
Generate ALL clinically relevant interactions. Return ONLY valid JSON array (empty if none):
[{"severity":"major|moderate|minor|synergistic","mechanism":"...","clinical_effect":"...","recommendation":"...","consumer_message":"simple message","practitioner_message":"clinical detail","timing_note":"or null","evidence_level":"established|moderate|theoretical","requires_hcp_review":true/false}]`
    }]
  });

  const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  return JSON.parse(match[0]).map((r: any, i: number) => ({
    rule_id: `${drug.toLowerCase().replace(/\s+/g, '_')}_${product.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`,
    agent_a: drug, agent_a_type: 'drug_class',
    agent_b: product, agent_b_type: 'farmceutica_product',
    interaction_type: 'drug-supplement',
    rationale_template: r.clinical_effect,
    blocks_protocol: r.severity === 'major',
    ...r,
  }));
}

async function main() {
  console.log('\nViaConnect Interaction Rules Generator');
  console.log(`Generating rules for ${DRUG_CLASSES.length} drugs x ${FARMCEUTICA_PRODUCTS.length} products...\n`);

  const allRules: any[] = [];

  for (const drug of DRUG_CLASSES) {
    for (const product of FARMCEUTICA_PRODUCTS) {
      process.stdout.write(`  ${drug} x ${product}...`);
      try {
        const rules = await generateRulesForPair(drug, product);
        allRules.push(...rules);
        console.log(` ${rules.length} rules`);
      } catch { console.log(' error'); }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const escape = (s: string) => (s || '').replace(/'/g, "''");
  const sqlLines = allRules.map(r => `INSERT INTO interaction_rules (rule_id,severity,interaction_type,agent_a,agent_a_type,agent_b,agent_b_type,mechanism,clinical_effect,recommendation,rationale_template,consumer_message,practitioner_message,timing_note,evidence_level,requires_hcp_review,blocks_protocol) VALUES ('${escape(r.rule_id)}','${r.severity}','${r.interaction_type}','${escape(r.agent_a)}','${r.agent_a_type}','${escape(r.agent_b)}','${r.agent_b_type}','${escape(r.mechanism)}','${escape(r.clinical_effect)}','${escape(r.recommendation)}','${escape(r.rationale_template)}','${escape(r.consumer_message)}','${escape(r.practitioner_message)}',${r.timing_note ? `'${escape(r.timing_note)}'` : 'NULL'},'${r.evidence_level || 'moderate'}',${!!r.requires_hcp_review},${!!r.blocks_protocol}) ON CONFLICT (rule_id) DO NOTHING;`);

  const outputPath = 'supabase/migrations/20260405000053_generated_interaction_rules.sql';
  fs.writeFileSync(outputPath, `-- AUTO-GENERATED: ${allRules.length} interaction rules\n\n${sqlLines.join('\n')}`);

  console.log(`\nGenerated ${allRules.length} rules -> ${outputPath}`);
  console.log('Run: supabase db push\n');
}

main().catch(console.error);
