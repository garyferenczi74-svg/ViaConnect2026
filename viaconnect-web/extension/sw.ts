/// <reference types="chrome" />
/**
 * Marshall Pre-Check — service worker.
 * Responsibilities:
 *  - OAuth via chrome.identity.launchWebAuthFlow.
 *  - Token storage in chrome.storage.session (cleared on browser restart).
 *  - API dispatch to /api/marshall/precheck/scan.
 *  - Context menu registration for selection-based scans.
 *  - Rate-limit backoff.
 *
 * This file is the skeleton; full OAuth + dispatcher lands in the follow-up
 * prompt when the bundler and OAuth credentials are approved.
 */

const SCAN_ENDPOINT = "https://via-connect2026.vercel.app/api/marshall/precheck/scan";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "marshall-scan-selection",
    title: "Scan selection with Marshall",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "marshall-scan-selection") return;
  if (!info.selectionText || !tab?.id) return;
  const token = await getSessionToken();
  if (!token) {
    await chrome.action.openPopup();
    return;
  }
  try {
    const r = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: info.selectionText, source: "extension" }),
    });
    const data = await r.json();
    await chrome.storage.session.set({ lastScan: data });
    await chrome.action.openPopup();
  } catch (err) {
    console.warn("marshall scan failed:", (err as Error).message);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "MARSHALL_SCAN") {
    (async () => {
      const token = await getSessionToken();
      if (!token) return sendResponse({ error: "not_authenticated" });
      try {
        const r = await fetch(SCAN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: msg.text, targetPlatform: msg.platform, source: "extension" }),
        });
        sendResponse(await r.json());
      } catch (err) {
        sendResponse({ error: (err as Error).message });
      }
    })();
    return true; // keep message channel open for async sendResponse
  }
});

async function getSessionToken(): Promise<string | null> {
  const { marshallToken } = await chrome.storage.session.get("marshallToken");
  return (marshallToken as string) ?? null;
}
