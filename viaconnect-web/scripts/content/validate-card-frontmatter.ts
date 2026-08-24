// Prompt 170r: validate educational card YAML frontmatter.
// Usage: npx tsx scripts/content/validate-card-frontmatter.ts [--root=path]
// Deterministic. No database writes. No new package.json dependencies.

import { loadEducationalCards, resolveEducationalCardsRoot } from '../../src/lib/content/authoring-pipeline/card-reader';
import { validateCardFrontmatter } from '../../src/lib/content/authoring-pipeline/validate-frontmatter';

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

  process.stdout.write(`Via Cura educational card frontmatter check\n`);
  process.stdout.write(`root: ${root}\n`);
  process.stdout.write(`cards: ${cards.length}\n\n`);

  for (const card of cards) {
    const result = validateCardFrontmatter(card);
    if (result.ok) {
      const titleNote = card.titleDerivedFromH1 ? ' (title from H1)' : '';
      process.stdout.write(
        `OK   ${card.relativePath}  slug=${card.frontmatter.slug}  category=${card.frontmatter.primary_category}${titleNote}\n`,
      );
      continue;
    }
    failed += 1;
    process.stdout.write(`FAIL ${card.relativePath}\n`);
    for (const issue of result.issues) {
      process.stdout.write(`     ${issue.field}: ${issue.message}\n`);
    }
  }

  process.stdout.write(`\n${cards.length} scanned, ${cards.length - failed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
