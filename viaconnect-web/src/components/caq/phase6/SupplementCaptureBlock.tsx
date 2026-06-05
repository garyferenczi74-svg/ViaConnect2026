'use client';

// =============================================================================
// Prompt 175l + 175m (2026-06-05): SupplementCaptureBlock.
//
// Reusable supplement capture block mounted on the Supplement Protocol
// page. Hannah's timing (175h), the multi-source resolver (175a/175g),
// and Marshall's canonical ingest all flow through the existing shared
// atomic components (SupplementBarcodeConfirm, SupplementPhotoUpload).
//
// 175m surfaces (2026-06-05): barcode entry removed per Gary, leaving
// search and photo as the two supported paths.
//
// Visual order:
//   1. Search field (typeahead against search_supplements RPC)
//   2. OR divider
//   3. SupplementPhotoUpload dashed card
//
// When the user picks a search result or analyzes a photo, the matching
// SupplementBarcodeConfirm panel mounts in place of the picker until
// the user confirms or cancels.
//
// Parent contract: onSupplementAdded fires with the fully-edited
// BarcodeConfirmRecord (primary + extras + timing) once the user taps
// Add to My Supplements in the confirm panel. The parent persists.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  SupplementBarcodeConfirm,
  type BarcodeConfirmRecord,
  type SupplementConfirmInitialDraft,
} from '@/components/caq/phase6/SupplementBarcodeConfirm';
import SupplementPhotoUpload from '@/components/caq/phase6/SupplementPhotoUpload';

type SearchRow = {
  brand_name: string;
  product_name: string;
  product_category: string;
};

export interface SupplementCaptureBlockProps {
  /**
   * Fires when the user confirms an addition. Caller persists to the
   * single user supplement intake store. Return a promise so the block
   * can disable inputs while saving and clear its own state on success.
   */
  onSupplementAdded: (record: BarcodeConfirmRecord) => void | Promise<void>;
  /**
   * Optional. Overrides the default placeholder copy when the page
   * voice prefers different language.
   */
  searchPlaceholder?: string;
}

const DEFAULT_PLACEHOLDER =
  'Search vitamins, minerals, supplements, and peptides by brand or ingredient';

export function SupplementCaptureBlock({
  onSupplementAdded,
  searchPlaceholder = DEFAULT_PLACEHOLDER,
}: SupplementCaptureBlockProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [pendingSearchDraft, setPendingSearchDraft] = useState<SupplementConfirmInitialDraft | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc('search_supplements', {
          search_query: searchQuery.trim().toLowerCase(),
          result_limit: 8,
        });
        if (Array.isArray(data)) {
          setSearchResults(
            (data as Array<Record<string, unknown>>).map((r) => ({
              brand_name: (r.brand_name as string) || '',
              product_name: (r.product_name as string) || '',
              product_category: (r.product_category as string) || 'Supplement',
            })),
          );
        }
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  async function commit(rec: BarcodeConfirmRecord): Promise<void> {
    setSaving(true);
    try {
      await onSupplementAdded(rec);
    } finally {
      setSaving(false);
    }
  }

  const isConfirming = pendingSearchDraft !== null;

  return (
    <div className="space-y-4">
      {/* Pickers hidden while a confirm panel is open so the page stays
          focused on a single action. */}
      {!isConfirming && (
        <>
          {/* Search field + dropdown */}
          <div className="space-y-2">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                disabled={saving}
                className="w-full min-w-0 pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 focus:outline-none text-sm disabled:opacity-50"
              />
            </div>
            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="rounded-xl bg-[#1E2D4A] border border-white/10 shadow-2xl max-h-64 overflow-y-auto">
                {searchResults.map((row, idx) => (
                  <button
                    key={`${row.brand_name}-${row.product_name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setPendingSearchDraft({
                        name: row.product_name,
                        brand: row.brand_name,
                      });
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white/90 min-w-0 truncate">{row.product_name}</span>
                      {row.brand_name ? (
                        <span className="text-xs text-white/40 flex-shrink-0">{row.brand_name}</span>
                      ) : null}
                    </div>
                    {row.product_category ? (
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">{row.product_category}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <OrDivider />

          {/* Prompt 175m (2026-06-05): Scan barcode button removed per
              Gary. Search and Photo remain the supported paths. */}

          {/* Photo upload (dashed card + two-photo capture + confirm) */}
          <SupplementPhotoUpload onProductAdded={(rec) => commit(rec)} />
        </>
      )}

      {/* Search-result confirmation panel */}
      {pendingSearchDraft && (
        <SupplementBarcodeConfirm
          barcodeValue={null}
          barcodeFormat={null}
          source="search"
          initialDraft={pendingSearchDraft}
          onConfirm={async (rec) => {
            await commit(rec);
            setPendingSearchDraft(null);
          }}
          onCancel={() => setPendingSearchDraft(null)}
        />
      )}

      {/* Prompt 175m (2026-06-05): SupplementBarcodeOverlay mount
          removed with the rest of the barcode entry path. */}
    </div>
  );
}

function OrDivider(): JSX.Element {
  return (
    <div className="flex items-center gap-4 my-2">
      <div className="flex-grow h-px bg-white/10" />
      <span className="text-xs text-white/25 font-medium uppercase tracking-wider">or</span>
      <div className="flex-grow h-px bg-white/10" />
    </div>
  );
}
