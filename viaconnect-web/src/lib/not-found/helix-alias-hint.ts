/**
 * Brief 36: optional "Did you mean Helix Rewards?" hint when an unknown
 * path still looks like a retired Helix / rewards URL.
 */

export function shouldSuggestHelixRewards(pathname: string): boolean {
  return /helix|reward/i.test(pathname);
}
