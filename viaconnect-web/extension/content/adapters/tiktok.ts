/// <reference types="chrome" />
/** TikTok Studio composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "tiktok",
  host: "tiktok.com/tiktokstudio",
  matches: (url) => url.hostname === "www.tiktok.com" && url.pathname.startsWith("/tiktokstudio"),
  findComposer: () => document.querySelector<HTMLElement>('textarea[placeholder*="caption" i], div[contenteditable="true"]'),
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
