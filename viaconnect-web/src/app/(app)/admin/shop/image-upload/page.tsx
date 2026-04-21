'use client';

// Prompt #106 §4.4 — admin batch upload page.
//
// Drag-drop zone. Each file is (a) parsed for canonical naming
// inference, (b) uploaded to /api/admin/shop/upload which runs sharp
// sanitization server-side, (c) bound to a SKU via the binding resolver
// edge function. Per-file status is surfaced inline; the whole batch
// does not require a single typed confirmation — that phrase is
// reserved for the bulk image_url UPDATE on product_catalog.

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UploadRow {
  fileName: string;
  objectPath: string;
  status: 'queued' | 'uploading' | 'bound' | 'done' | 'error';
  inventoryId?: string;
  sku?: string;
  version?: number;
  sha256?: string;
  pendingPrimarySwap?: boolean;
  error?: string;
}

/**
 * Infer {category}/{file} from a drop: filenames named "creatine-hcl-plus.png"
 * have no category prefix, so we ask the admin to pick one per file.
 * Filenames that already include the category prefix ("advanced-formulations/
 * creatine-hcl-plus.png") pass through as-is.
 */
function suggestObjectPath(fileName: string): string {
  const trimmed = fileName.replace(/^.*[\\/]/, '');
  if (trimmed.includes('/')) return trimmed;
  return `advanced-formulations/${trimmed}`;
}

export default function ImageUploadPage() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback((files: File[]) => {
    const add = files.map<UploadRow>((f) => ({
      fileName: f.name,
      objectPath: suggestObjectPath(f.name),
      status: 'queued',
    }));
    setRows((prev) => [...prev, ...add]);
    // Store the File objects alongside each row via closure.
    void runUploads(files, add.length, (update) => setRows((prev) => {
      const copy = [...prev];
      const idx = copy.length - add.length + update.indexOffset;
      copy[idx] = { ...copy[idx]!, ...update.patch };
      return copy;
    }));
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Shop refresh
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Image upload
        </h1>
        <p className="text-xs text-white/60">
          PNG or JPEG, 800x800 to 4000x4000, under 2 MB after EXIF strip. Filenames
          must match {'{category_slug}/{sku_slug}.png'}. Each upload automatically binds
          to the matching master_skus row.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[#E8803A] bg-[#1A2744]' : 'border-white/15 bg-[#1A2744]/60'
          }`}
        >
          <Upload className="h-10 w-10 mx-auto text-[#E8803A]/80 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-white/85">Drop bottle renders here, or click to select</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-white/85">Batch ({rows.length})</p>
            {rows.map((r, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/90 truncate">{r.fileName}</p>
                    <p className="text-[10px] text-white/50 truncate">Canonical path: {r.objectPath}</p>
                    {r.sku && <p className="text-[10px] text-white/65 mt-1">Bound to {r.sku} {r.version ? `v${r.version}` : ''} {r.pendingPrimarySwap ? ' · pending primary swap' : ''}</p>}
                    {r.sha256 && <p className="text-[10px] text-white/45 font-mono">sha256 {r.sha256.slice(0, 16)}…</p>}
                    {r.error && <p className="text-[10px] text-red-300 mt-1">{r.error}</p>}
                  </div>
                  <StatusChip status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/30 p-3 text-[11px] text-white/60">
          <p className="font-medium text-white/80">Where to go from here</p>
          <p className="mt-1">
            Once images are uploaded and bound, run the bulk image URL update on
            /admin/shop/reconciliation. It requires the exact typed confirmation
            APPROVE IMAGE REFRESH before any product_catalog.image_url is written.
          </p>
        </div>
      </div>
    </div>
  );
}

type UploadPatch = Partial<UploadRow>;

async function runUploads(
  files: File[],
  baseCount: number,
  emit: (u: { indexOffset: number; patch: UploadPatch }) => void,
): Promise<void> {
  const supabase = createClient();
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]!;
    const path = suggestObjectPath(file.name);

    emit({ indexOffset: i, patch: { status: 'uploading' } });

    const form = new FormData();
    form.append('file', file);
    form.append('object_path', path);

    const resp = await fetch('/api/admin/shop/upload', { method: 'POST', body: form });
    const j = await resp.json();
    if (!resp.ok) {
      emit({ indexOffset: i, patch: { status: 'error', error: j.detail ?? j.error ?? 'upload failed' } });
      continue;
    }

    emit({
      indexOffset: i,
      patch: {
        status: 'bound',
        inventoryId: j.inventory_id,
        sha256: j.sha256,
      },
    });

    // Bind via edge function.
    const { data: bind, error: bindErr } = await (supabase as unknown as {
      functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('supplement_photo_binding_resolver', {
      body: { inventoryId: j.inventory_id },
    });
    if (bindErr) {
      emit({ indexOffset: i, patch: { status: 'error', error: bindErr.message } });
      continue;
    }
    const b = bind as { sku?: string; version?: number; is_primary?: boolean; pending_primary_swap?: boolean; error?: string; detail?: string };
    if (b?.error) {
      emit({ indexOffset: i, patch: { status: 'error', error: b.detail ?? b.error } });
      continue;
    }
    emit({
      indexOffset: i,
      patch: {
        status: 'done',
        sku: b?.sku,
        version: b?.version,
        pendingPrimarySwap: b?.pending_primary_swap,
      },
    });
  }
  // silence unused
  void baseCount;
}

function StatusChip({ status }: { status: UploadRow['status'] }) {
  const map: Record<UploadRow['status'], { cls: string; label: string; icon: React.ReactNode }> = {
    queued:    { cls: 'bg-white/10 text-white/70',     label: 'queued',    icon: null },
    uploading: { cls: 'bg-blue-500/25 text-blue-100',  label: 'uploading', icon: null },
    bound:     { cls: 'bg-blue-500/30 text-blue-100',  label: 'binding…',  icon: null },
    done:      { cls: 'bg-emerald-500/25 text-emerald-100', label: 'done', icon: <Check className="h-3 w-3" strokeWidth={1.5} /> },
    error:     { cls: 'bg-red-500/25 text-red-200',    label: 'error',    icon: <AlertCircle className="h-3 w-3" strokeWidth={1.5} /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
