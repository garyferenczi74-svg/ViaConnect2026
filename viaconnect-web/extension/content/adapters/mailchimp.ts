/// <reference types="chrome" />
/** Mailchimp composer adapter — STUB. */
import type { ComposerAdapter } from "../types";
import { observeComposer } from "../base";

const adapter: ComposerAdapter = {
  id: "mailchimp",
  host: "admin.mailchimp.com",
  matches: (url) => url.hostname.endsWith("admin.mailchimp.com"),
  findComposer: () => document.querySelector<HTMLElement>('iframe[title*="campaign" i]') as unknown as HTMLElement
    ?? document.querySelector<HTMLElement>('[contenteditable="true"]'),
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
