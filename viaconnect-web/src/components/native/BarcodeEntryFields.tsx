"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { digitsFromScan } from "@/lib/native/barcode-digits";
import { scanProductBarcode } from "@/lib/native/scan-barcode";
import { validateBarcode } from "@/lib/nutrition/barcode/checksum";

export function BarcodeEntryFields(props: {
  title: string;
  body: string;
  onDigits: (digits: string, format: string | null) => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function accept(raw: string) {
    const digits = digitsFromScan(raw);
    const validation = validateBarcode(digits);
    if (!validation.valid && validation.reason === "wrong_length") {
      setNote("Use 8, 12, 13, or 14 digits from the package barcode.");
      return;
    }
    if (!validation.valid && validation.reason === "non_numeric") {
      setNote("Barcodes are digits only.");
      return;
    }
    setNote(validation.valid ? null : "The check digit does not match. You can still look this code up.");
    props.onDigits(digits, validation.format);
  }

  async function scan() {
    setBusy(true);
    setNote(null);
    const result = await scanProductBarcode();
    setBusy(false);
    if (!result.ok) {
      if (result.reason === "cancelled") return;
      setNote(result.reason === "empty" ? "No barcode was read. Type the digits instead." : "The camera scan did not finish. Type the digits instead.");
      return;
    }
    accept(result.digits);
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">{props.title}</p>
          <p className="mt-1 text-sm text-white/55">{props.body}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => { void scan(); }}
          disabled={busy}
          className="min-h-[44px] w-full rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-[#0B1120] disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Opening camera..." : "Scan barcode"}
        </button>
        <label className="sr-only" htmlFor="barcode-digits">Barcode digits</label>
        <input
          id="barcode-digits"
          inputMode="numeric"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Or type the barcode"
          className="min-h-[44px] w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={() => accept(typed)}
          className="min-h-[44px] w-full rounded-xl border border-white/15 px-4 text-sm text-white sm:w-auto"
        >
          Look up
        </button>
      </div>
      {note ? <p className="text-sm text-[#E8A87C]" role="status">{note}</p> : null}
    </div>
  );
}
