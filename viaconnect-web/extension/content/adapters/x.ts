/// <reference types="chrome" />
/** X (Twitter) composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "x",
  host: "x.com",
  matches: (url) => url.hostname === "x.com" || url.hostname === "twitter.com",
  findComposer: () => document.querySelector<HTMLElement>('div[data-testid="tweetTextarea_0"]'),
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
