import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint,
} from "@capacitor/barcode-scanner";
import { digitsFromScan } from "@/lib/native/barcode-digits";

export type BarcodeScanOutcome =
  | { ok: true; digits: string }
  | { ok: false; reason: "cancelled" | "empty" | "failed" };

export async function scanProductBarcode(): Promise<BarcodeScanOutcome> {
  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      scanInstructions: "Point the camera at the barcode on the package.",
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanButton: false,
      cancelButtonAccessibilityLabel: "Cancel barcode scan",
    });
    const digits = digitsFromScan(result.ScanResult ?? "");
    if (!digits) return { ok: false, reason: "empty" };
    return { ok: true, digits };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancel/i.test(message)) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: "failed" };
  }
}
