/**
 * ComposerAdapter interface — every host-specific content script implements
 * this. Adapters are responsible for finding the composer element on their
 * target platform and reading / writing its text on explicit user action.
 */

export interface ComposerAdapter {
  id: string;
  host: string;
  matches(url: URL): boolean;
  findComposer(): HTMLElement | null;
  extractDraftText(el: HTMLElement): string;
  applyRewrite(el: HTMLElement, rewrite: string): void;
  getAttachedMediaUrls(): string[];
}

export const MARSHALL_DISABLE_ATTR = "data-marshall-disable";

/**
 * Respect the escape hatch: if the composer element (or any ancestor) carries
 * data-marshall-disable, the adapter must decline to read it.
 */
export function isDisabled(el: Element | null): boolean {
  for (let cur: Element | null = el; cur; cur = cur.parentElement) {
    if (cur.hasAttribute(MARSHALL_DISABLE_ATTR)) return true;
  }
  return false;
}
