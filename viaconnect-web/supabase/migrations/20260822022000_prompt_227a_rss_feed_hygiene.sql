-- Prompt 227a: degrade broken/noisy RSS feeds pending better endpoints.
UPDATE public.authorities_sources
SET registry_status = 'degraded',
    notes = COALESCE(notes, '') || ' ASCO Post feed yielded non-article URLs; pending better society RSS or journal split.',
    updated_at = now()
WHERE domain = 'ascopubs.org';

UPDATE public.authorities_sources
SET registry_status = 'degraded',
    notes = COALESCE(notes, '') || ' Drug Target Review feed 404; pending corrected RSS URL.',
    updated_at = now()
WHERE domain = 'www.drugtargetreview.com';
