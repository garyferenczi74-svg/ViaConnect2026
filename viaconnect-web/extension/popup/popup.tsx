/// <reference types="chrome" />
/**
 * Extension popup — skeleton.
 * Final implementation mirrors src/components/precheck/PrecheckWorkspace.tsx
 * but with a tighter layout for the popup viewport. Wiring lands when the
 * bundler + OAuth credentials are approved in a follow-up prompt.
 */

import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

interface ScanResult {
  status: string;
  findings: Array<{ ruleId: string; severity: string; message: string }>;
  cleared: boolean;
  receipt?: { receiptId: string };
}

function PopupApp() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.storage.session.get(["marshallToken", "lastScan"], (res) => {
      setAuthed(!!res.marshallToken);
      if (res.lastScan) setScan(res.lastScan as ScanResult);
    });
  }, []);

  if (authed === false) {
    return (
      <div className="stack">
        <h3>Marshall Pre-Check</h3>
        <p>Sign in with your ViaConnect account to scan drafts.</p>
        <button>Sign in</button>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="stack">
        <h3>Marshall Pre-Check</h3>
        <p>Select text on a supported composer, right-click, and choose "Scan selection with Marshall". Or click the Scan button injected into the composer.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h3>Status: {scan.status}</h3>
      {scan.cleared && scan.receipt ? (
        <p>Cleared. Receipt: <code>{scan.receipt.receiptId}</code></p>
      ) : (
        <ul>
          {scan.findings.map((f, i) => (
            <li key={i}>
              <strong>[{f.severity}]</strong> <code>{f.ruleId}</code>
              <p>{f.message}</p>
            </li>
          ))}
        </ul>
      )}
      <a href="https://via-connect2026.vercel.app/practitioner/marshall/precheck" target="_blank" rel="noopener">
        Open full session in ViaConnect
      </a>
    </div>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<PopupApp />);
