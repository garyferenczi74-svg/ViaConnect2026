/**
 * Pre-launch display lock for Tesofensine and BPC-157 (and the aliases
 * already stored on Via Cura formulas).
 *
 * Gary Soft GO 2026-10-05, via Jeffery. Elizabeth lock via Lex.
 * Products stay listed. Ingredient rows stay in the database and in
 * masterFormulations. While this lock is on, shoppers and speakable
 * protocol / RAG paths omit the names. No replacement dose is written.
 *
 * Default is hidden. Reveal only after launch, when Supplement Facts
 * match the final label:
 *   LOCKED_INGREDIENT_DISPLAY=show            (server)
 *   NEXT_PUBLIC_LOCKED_INGREDIENT_DISPLAY=show (client bundles)
 * Any other value, including unset, fails closed.
 */

const PHRASE_SOURCE =
  String.raw`\b(?:liposomal\s+|micellar\s+)?(?:bpc[\s-]*157|bpc157|body[\s-]*protective\s+compound|body\s+protection\s+compound|tesofensine(?:\s*\([^)]*\))?|bpc)(?:\s+gut-healing\s+peptide|\s+peptide)?\b`;

function phrase(flags: string): RegExp {
  return new RegExp(PHRASE_SOURCE, flags);
}

export function lockedIngredientsVisible(): boolean {
  return (
    process.env.LOCKED_INGREDIENT_DISPLAY === 'show' ||
    process.env.NEXT_PUBLIC_LOCKED_INGREDIENT_DISPLAY === 'show'
  );
}

export function isLockedIngredientName(name: string | null | undefined): boolean {
  if (!name) return false;
  return phrase('i').test(name.normalize('NFKC'));
}

export function omitLockedIngredients<T>(
  items: readonly T[] | null | undefined,
  nameOf: (item: T) => string | null | undefined,
): T[] {
  const list = items ? [...items] : [];
  if (lockedIngredientsVisible()) return list;
  return list.filter((item) => !isLockedIngredientName(nameOf(item)));
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?:\s*,)+/g, ',')
    .replace(/\(\s*,\s*/g, '(')
    .replace(/,\s*\)/g, ')')
    .replace(/\(\s*\)/g, '')
    .replace(/,\s*([.;:])/g, '$1')
    .replace(/\s+([.;:])/g, '$1')
    .replace(/:\s*,\s*/g, ': ')
    .replace(/([\u2014\u2013-])\s*,\s*/g, '$1 ')
    .replace(/,\s*([\u2014\u2013-])/g, ' $1')
    .replace(/\b(and|with|via|including|for|of)\s*,\s*/gi, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function mentionsLocked(text: string): boolean {
  return phrase('i').test(text);
}

function removePhrases(text: string): string {
  return text.replace(phrase('gi'), '');
}

function splitSentences(line: string): string[] {
  return line.split(/(?<=[.!?])\s+(?=[A-Z("'])/);
}

function scrubSegment(segment: string): string {
  if (!mentionsLocked(segment)) return segment;
  const commas = segment.match(/,/g)?.length ?? 0;
  if (commas >= 2) {
    const kept = tidy(removePhrases(segment));
    return /[A-Za-z0-9]/.test(kept) ? kept : '';
  }
  return '';
}

/**
 * Drop locked names from text that is about to be shown or spoken.
 * List items are removed. A sentence that is not a list is omitted whole.
 * Words are never added.
 */
export function redactLockedIngredientText(input: string | null | undefined): string {
  if (input == null) return '';
  if (!input) return input;
  if (lockedIngredientsVisible()) return input;
  if (!mentionsLocked(input)) return input;

  const keptLines: string[] = [];
  for (const line of input.split('\n')) {
    if (/^\s*[-*]\s/.test(line)) {
      const label = line.match(/\*\*([^*]+)\*\*/)?.[1] ?? '';
      if (label && isLockedIngredientName(label)) continue;
    }
    const kept = splitSentences(line)
      .map((segment) => scrubSegment(segment))
      .filter((segment) => segment.trim().length > 0);
    const joined = tidy(kept.join(' '));
    if (joined) keptLines.push(joined);
  }
  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function applyLockedIngredientShopFields<
  T extends {
    ingredients?: { name: string }[] | null;
    description?: string | null;
    summary?: string | null;
  },
>(product: T): T {
  if (lockedIngredientsVisible()) return product;
  return {
    ...product,
    ingredients: product.ingredients
      ? omitLockedIngredients(product.ingredients, (item) => item.name)
      : product.ingredients,
    description:
      product.description != null
        ? redactLockedIngredientText(product.description)
        : product.description,
    summary:
      product.summary != null ? redactLockedIngredientText(product.summary) : product.summary,
  };
}
