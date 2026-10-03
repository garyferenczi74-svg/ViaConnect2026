/** Keep digits only. Product barcodes are numeric (EAN, UPC, ITF). */
export function digitsFromScan(raw: string): string {
  return raw.replace(/\D/g, "");
}
