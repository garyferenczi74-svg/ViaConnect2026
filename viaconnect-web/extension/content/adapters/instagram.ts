/// <reference types="chrome" />
/**
 * Instagram composer adapter (SAMPLE implementation).
 *
 * DOM selectors captured from Instagram's web composer as of 2026-04-23.
 * Selectors will drift; this adapter is the template other adapters follow.
 * Selector updates are an operational task, not a code policy question.
 */

import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "instagram",
  host: "instagram.com",
  matches: (url) => url.hostname.endsWith("instagram.com"),
  findComposer: () => {
    // Instagram's caption field is a contenteditable div with role textbox.
    return document.querySelector<HTMLElement>('div[role="textbox"][aria-label*="caption" i]')
      ?? document.querySelector<HTMLElement>('div[role="textbox"][contenteditable="true"]')
      ?? null;
  },
  extractDraftText: (el) => {
    return (el.innerText ?? el.textContent ?? "").trim();
  },
  applyRewrite: (el, rewrite) => {
    // Replace composer content via execCommand for contenteditable compatibility.
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertText", false, rewrite);
  },
  getAttachedMediaUrls: () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="instagram"]'));
    return imgs.map((i) => i.src).filter(Boolean);
  },
};

if (adapter.matches(new URL(location.href))) {
  observeComposer(adapter, 'div[role="dialog"]');
}

export {};
