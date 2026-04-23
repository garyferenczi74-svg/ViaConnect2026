/// <reference types="chrome" />
/** ConvertKit / Kit composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "convertkit",
  host: "kit.com",
  matches: (url) => url.hostname === "app.kit.com" || url.hostname === "app.convertkit.com",
  findComposer: () => document.querySelector<HTMLElement>('[contenteditable="true"]'),
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
