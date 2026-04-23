/// <reference types="chrome" />
/** Substack composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "substack",
  host: "substack.com",
  matches: (url) => url.hostname.endsWith("substack.com"),
  findComposer: () => document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]'),
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

if (adapter.matches(new URL(location.href))) observeComposer(adapter, "body");
export {};
