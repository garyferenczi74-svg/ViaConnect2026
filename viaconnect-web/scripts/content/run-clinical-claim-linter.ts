// Prompt 170r: dry-run clinical-claim linter for educational cards.
// Usage: npx tsx scripts/content/run-clinical-claim-linter.ts [--root=path]
// Deterministic. No database writes. No runtime LLM.

import { loadEducationalCards, resolveEducationalCardsRoot } from '../../src/lib/content/authoring-pipeline/card-reader';
import { lintEducationalCard } from '../../src/lib/content/authoring-pipeline/internal-linter';

function parseRoot(argv: readonly string[]): string {
  for (const arg of argv) {
    if (arg.startsWith('--root=')) return arg.slice('--root='.length);
  }
  return resolveEducationalCardsRoot();
}

function main(): void {
  const root = parseRoot(process.argv.slice(2));
  const cards = loadEducationalCards(root);
  let failed = 0;

  process.stdout.write(`Via Cura educational card clinical-claim linter (dry-run)\n`);
  process.stdout.write(`root: ${root}\n`);
  process.stdout.write(`cards: ${cards.length}\n\n`);

  for (const card of cards) {
    const result = lintEducationalCard(card);
    if (result.ok) {
      process.stdout.write(`OK   ${card.relativePath}\n`);
      continue;
    }
    failed += 1;
    process.stdout.write(`FAIL ${card.relativePath}\n`);
    for (const finding of result.findings) {
      process.stdout.write(
        `     [${finding.code}] ${finding.message}${finding.excerpt ? ` :: ${finding.excerpt}` : ''}\n`,
      );
    }
  }

  process.stdout.write(`\n${cards.length} scanned, ${cards.length - failed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
