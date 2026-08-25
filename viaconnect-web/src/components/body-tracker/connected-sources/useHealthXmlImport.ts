'use client';

// Prompt 230, Task 5: the Apple Health / Hume XML import engine, extracted
// out of AppleHealthImportModal so it can be reused by the connected-source
// detail panel (Task 6) as well as the modal.
//
// The flow is unchanged from Prompt 201 / Task 3:
//   1. resolve userId via supabase.auth.getUser()
//   2. insert an apple_health_imports staging row, returning its id
//   3. upload the zip to the private apple-health-imports bucket at
//      {userId}/{importId}.zip
//   4. POST the parse request to the server route, which streams the zip,
//      normalizes records, and posts them through the ingestion funnel
//
// Hume Health (the Body Pod, operated by FitTrack Inc) has no public API; it
// reaches us only as an attribution origin tagged on Apple Health records.
//
// Resilience: every async step is wrapped; failures surface a graceful
// message and never throw out of the hook. No emojis. No em or en dashes
// anywhere.

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { parseImportSummary, isImportComplete, type ImportSummary } from '@/lib/body-tracker/connected-sources/import-summary';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';

export const BUCKET = 'apple-health-imports';
export const PARSE_ENDPOINT = '/api/body-tracker/connected-sources/apple-health/parse';
const MAX_BYTES = 200 * 1024 * 1024; // mirrors the bucket file_size_limit (200 MB)

export type Phase = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export type HealthXmlImportIntent = 'apple' | 'hume';

export const HEALTH_XML_IMPORT_COPY = {
  apple: {
    title: 'Import from Apple Health',
    lead: 'On your iPhone open Health, tap your profile picture, then Export All Health Data. Upload the .xml or .zip here.',
    dropTitle: 'Drop your Health export XML',
    fileError:
      'Choose an Apple Health export .xml or .zip. On iPhone open Health, tap your profile, then Export All Health Data.',
    toast: 'Apple Health import complete',
  },
  hume: {
    title: 'Import Hume Body Pod',
    lead: 'Hume has no public developer API. Upload an Apple Health export so Hume-tagged body and weight rows can ingest.',
    dropTitle: 'Drop your Hume-tagged Health export XML',
    fileError:
      'Choose an Apple Health export .xml or .zip so Hume-tagged body and weight rows can ingest.',
    toast: 'Hume Body Pod import complete',
  },
} as const;

export interface UseHealthXmlImportResult {
  phase: Phase;
  errorMsg: string;
  result: ImportSummary | null;
  runImport: (file: File) => Promise<void>;
  reset: () => void;
}

export function useHealthXmlImport(
  intent: HealthXmlImportIntent,
  onImported?: () => void,
): UseHealthXmlImportResult {
  const copy = HEALTH_XML_IMPORT_COPY[intent];
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ImportSummary | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setErrorMsg('');
    setResult(null);
  }, []);

  const runImport = useCallback(
    async (file: File) => {
      setErrorMsg('');
      setResult(null);

      // Light client-side guards. The bucket enforces type and size server side.
      const name = (file.name || '').toLowerCase();
      const isXml = name.endsWith('.xml');
      const isZip = name.endsWith('.zip');
      if (!isXml && !isZip) {
        setPhase('error');
        setErrorMsg(copy.fileError);
        return;
      }
      if (file.size > MAX_BYTES) {
        setPhase('error');
        setErrorMsg('That export is larger than 200 MB. Try exporting a shorter date range from the Health app.');
        return;
      }

      const supabase = createClient();

      // Step 1: resolve the signed-in user.
      let userId: string;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          setPhase('error');
          setErrorMsg('Please sign in again to import your Health data.');
          return;
        }
        userId = data.user.id;
      } catch {
        setPhase('error');
        setErrorMsg('We could not confirm your session. Please sign in again.');
        return;
      }

      // Step 2: create the staging row.
      let importId: string;
      try {
        const { data, error } = await supabase
          .from('apple_health_imports')
          .insert({ user_id: userId, file_name: file.name })
          .select('id')
          .single();
        if (error || !data?.id) {
          setPhase('error');
          setErrorMsg('We could not start the import. Please try again in a moment.');
          return;
        }
        importId = data.id as string;
      } catch {
        setPhase('error');
        setErrorMsg('We could not start the import. Please try again in a moment.');
        return;
      }

      // Step 3: upload the zip.
      setPhase('uploading');
      const ext = isXml ? 'xml' : 'zip';
      const storagePath = `${BUCKET}/${userId}/${importId}.${ext}`;
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${userId}/${importId}.${ext}`, file, {
            upsert: true,
            contentType: isXml ? 'application/xml' : 'application/zip',
          });
        if (error) {
          setPhase('error');
          setErrorMsg('The upload did not complete. Check your connection and try again.');
          return;
        }
      } catch {
        setPhase('error');
        setErrorMsg('The upload did not complete. Check your connection and try again.');
        return;
      }

      // Step 4: parse on the server.
      setPhase('parsing');
      try {
        const res = await withAbortTimeout(
          (signal) => fetch(PARSE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ importId, storagePath, fileKind: ext }),
            signal,
          }),
          // 300000ms (300s) matches the parse route's maxDuration = 300; keep the two in sync.
          300000,
          'apple-health-parse',
        );
        const json = res.ok ? await res.json().catch(() => null) : null;
        if (!res.ok || !isImportComplete(json)) {
          setPhase('error');
          setErrorMsg('We uploaded your file but could not finish reading it. Please try again.');
          return;
        }
        setResult(parseImportSummary(json));
        setPhase('done');
        toast.success(copy.toast);
        onImported?.();
      } catch (err) {
        setPhase('error');
        setErrorMsg(
          isTimeoutError(err)
            ? 'Reading your Health data is taking longer than expected. Please try again.'
            : 'We uploaded your file but could not finish reading it. Please try again.',
        );
      }
    },
    [copy.fileError, copy.toast, onImported],
  );

  return { phase, errorMsg, result, runImport, reset };
}
