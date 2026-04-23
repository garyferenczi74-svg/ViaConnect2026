/// <reference types="chrome" />
/**
 * LinkedIn composer adapter — STUB.
 * Selector discovery is a follow-up-prompt task; this file declares the
 * adapter shape and registers the observer so the scaffold compiles.
 */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "linkedin",
  host: "linkedin.com",
  matches: (url) => url.hostname.endsWith("linkedin.com"),
  findComposer: () => document.querySelector<HTMLElement>('div[role="textbox"][contenteditable="true"]'),
  extractDraftText: (el) => (el.innerText ?? el.textContent ?? "").trim(),
  applyRewrite: (el, rewrite) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertText", false, rewrite);
  },
  getAttachedMediaUrls: () => [],
};

if (adapter.matches(new URL(location.href))) {
  observeComposer(adapter, "body");
}

export {};
