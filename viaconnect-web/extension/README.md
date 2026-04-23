# Marshall Pre-Check — Browser Extension Scaffold

Prompt #121 delivery. This is a **scaffold**: manifest, service worker skeleton, popup stub, one sample content adapter (Instagram), and placeholder adapters for the remaining 13 target platforms. A follow-up prompt will approve a bundler (esbuild or Vite) and flesh out the adapters, OAuth flow, popup UI, and the Chrome Web Store / Edge Add-ons / Firefox AMO listings.

## Hard rules honored here

- **No scraping.** Content scripts read the composer only when the user clicks the Scan button or uses the context menu.
- **Explicit host permissions only.** No `<all_urls>`. The manifest lists each composer domain by hand.
- **No third-party analytics.** No Mixpanel, PostHog, Sentry, or any telemetry SDK in the bundle.
- **OAuth tokens in session storage.** `chrome.storage.session` clears on browser restart.
- **Escape hatch.** Content scripts check for `data-marshall-disable` on the composer; if present, they decline to read it.
- **Draft privacy.** Draft text crosses the network to the Marshall API and is hashed server-side. The extension does not persist draft content locally.

## Structure

```
extension/
  README.md
  manifest.json              MV3 manifest, explicit host permissions
  sw.ts                      Service worker: OAuth, context menus, scan dispatch
  popup/
    popup.html
    popup.tsx                Popup UI root (stub)
    popup.css
  content/
    types.ts                 ComposerAdapter interface
    base.ts                  shared "Scan with Marshall" button injector
    adapters/
      instagram.ts           FULL sample adapter
      linkedin.ts            stub
      x.ts                   stub
      facebook.ts            stub
      tiktok.ts              stub
      youtubeStudio.ts       stub
      substack.ts            stub
      wordpress.ts           stub
      medium.ts              stub
      beehiiv.ts             stub
      convertkit.ts          stub
      mailchimp.ts           stub
      genericSelection.ts    right-click menu adapter
  lib/
    auth.ts                  chrome.identity.launchWebAuthFlow wrapper
    api.ts                   POST /api/marshall/precheck/scan
    logger.ts                local-only logger; no remote sink
```

## What's NOT in this scaffold

- No bundler config. The follow-up prompt will approve one (esbuild or Vite) and add its dependency to the extension's own `package.json` (kept separate from the root project `package.json` which is locked).
- No Chrome Web Store / Edge / Firefox listing copy or icons.
- No end-to-end OAuth test harness.
- No test suite in this directory — the follow-up prompt will add Playwright-based extension tests.

## Completion workflow

1. Approve bundler dependency.
2. Flesh out each stub adapter with the composer DOM selectors captured from a current snapshot of each platform.
3. Replace the popup stub with a full diff viewer (pair it with `src/components/precheck/DiffViewer.tsx` from the main repo).
4. Wire OAuth to the actual ViaConnect OAuth endpoint (credentials provisioned by Gary).
5. Submit to Chrome Web Store, Edge Add-ons, Firefox AMO.
