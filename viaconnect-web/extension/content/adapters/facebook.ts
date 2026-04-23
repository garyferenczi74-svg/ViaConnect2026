/// <reference types="chrome" />
/** Facebook Pages composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "facebook",
  host: "facebook.com",
  matches: (url) => url.hostname.endsWith("facebook.com"),
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

if (adapter.matches(new URL(location.href))) observeComposer(adapter, "body");
export {};
