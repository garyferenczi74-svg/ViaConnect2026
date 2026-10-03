"use client";

import { useState } from "react";
import type { MealDraft } from "@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types";
import { BarcodeEntryFields } from "@/components/native/BarcodeEntryFields";
import { barcodeProductToMealDraft, readMealLookupProduct } from "@/lib/nutrition/barcode/to-meal-draft";

export function MealBarcodeEntry(props: { onDraft: (draft: MealDraft) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(digits: string) {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/nutrition/barcode/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: digits }),
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = readError(json);
        setNote(message ?? "That barcode could not be looked up.");
        return;
      }
      const product = readMealLookupProduct(json);
      if (!product) {
        setNote("No packaged food matched that barcode. You can still photograph the meal.");
        return;
      }
      props.onDraft(barcodeProductToMealDraft(product, digits));
    } catch {
      setNote("The lookup did not finish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <BarcodeEntryFields
        title="Packaged food barcode"
        body="The camera reads the barcode on the package. A photo is not uploaded unless you save one separately. You can type the digits on a computer."
        onDigits={(digits) => { void lookup(digits); }}
      />
      {busy ? <p className="text-sm text-white/55">Looking up that barcode...</p> : null}
      {note ? <p className="text-sm text-[#E8A87C]" role="status">{note}</p> : null}
    </div>
  );
}

function readError(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const error = (json as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null) return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}
