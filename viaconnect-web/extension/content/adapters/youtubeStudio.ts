/// <reference types="chrome" />
/** YouTube Studio composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "youtubeStudio",
  host: "studio.youtube.com",
  matches: (url) => url.hostname === "studio.youtube.com",
  findComposer: () => document.querySelector<HTMLElement>('ytcp-social-suggestion-input, textarea#title, textarea#description'),
  extractDraftText: (el) => (el instanceof HTMLTextAreaElement ? el.value : (el.innerText ?? el.textContent ?? "")).trim(),
  applyRewrite: (el, rewrite) => {
    if (el instanceof HTMLTextAreaElement) {
      el.value = rewrite;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertText", false, rewrite);
    }
  },
  getAttachedMediaUrls: () => [],
};

if (adapter.matches(new URL(location.href))) observeComposer(adapter, "body");
export {};
