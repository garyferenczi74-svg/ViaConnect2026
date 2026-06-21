// Prompt 204 (2026-06-21): the EpigenHQ upload is no longer a standalone page; it
// is the EpigenHQ tab on the Upload Genetic Data page. This route now redirects
// there (preselecting the tab) so any saved link or bookmark still lands in the
// right place.

import { redirect } from "next/navigation";

export default function EpigenUploadRedirect() {
  redirect("/genetics/upload?tab=epigen");
}
