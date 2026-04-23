/// <reference types="chrome" />
/**
 * Shared helper: inject a "Scan with Marshall" button next to a composer,
 * wired to send the composer text to the service worker on click.
 *
 * The button is injected only once per composer. It is keyboard-focusable and
 * uses aria-label for screen reader announcement.
 */

import type { ComposerAdapter } from "./types";
import { isDisabled } from "./types";

const BUTTON_CLASS = "marshall-scan-btn";

export function injectScanButton(adapter: ComposerAdapter, host: HTMLElement, composer: HTMLElement) {
  if (isDisabled(composer)) return;
  if (host.querySelector(`.${BUTTON_CLASS}`)) return;

  const btn = document.createElement("button");
  btn.className = BUTTON_CLASS;
  btn.type = "button";
  btn.textContent = "Scan with Marshall";
  btn.setAttribute("aria-label", "Scan this draft with Marshall before publishing");
  btn.style.cssText = [
    "margin-left:8px",
    "padding:6px 10px",
    "border:1px solid rgba(183,94,24,0.5)",
    "background:rgba(183,94,24,0.15)",
    "color:#b75e18",
    "border-radius:8px",
    "font-size:12px",
    "cursor:pointer",
  ].join(";");
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const text = adapter.extractDraftText(composer);
    if (!text || text.length < 3) return;
    btn.disabled = true;
    btn.textContent = "Scanning...";
    try {
      const resp: unknown = await chrome.runtime.sendMessage({
        type: "MARSHALL_SCAN",
        text,
        platform: adapter.id,
      });
      await chrome.storage.session.set({ lastScan: resp });
      await chrome.action.openPopup();
    } catch (err) {
      console.warn("[marshall] scan dispatch failed", (err as Error).message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Scan with Marshall";
    }
  });
  host.appendChild(btn);
}

// Poll-based detection for SPA composers that mount late.
export function observeComposer(adapter: ComposerAdapter, hostSelector: string) {
  const tryInject = () => {
    const composer = adapter.findComposer();
    if (!composer) return;
    const host = document.querySelector<HTMLElement>(hostSelector) ?? composer.parentElement;
    if (host) injectScanButton(adapter, host, composer);
  };
  tryInject();
  const obs = new MutationObserver(tryInject);
  obs.observe(document.body, { childList: true, subtree: true });
}
