-- Prompt 227a: correct PubMed journal filters and ODS RSS status.
-- Append-only. nnhkcufyqjojdbvdrpky only.

UPDATE public.authorities_sources
SET journal_filter = '"Am J Clin Nutr"[Journal]',
    notes = COALESCE(notes, '') || ' Filter uses MEDLINE abbrev Am J Clin Nutr.',
    updated_at = now()
WHERE domain = 'journal.ajcn';

UPDATE public.authorities_sources
SET journal_filter = '"Clin Nutr"[Journal]',
    notes = COALESCE(notes, '') || ' Filter uses MEDLINE abbrev Clin Nutr.',
    updated_at = now()
WHERE domain = 'journal.clinical-nutrition';

-- ODS RSS endpoints currently return 403 from automated fetch; keep Tier 1
-- registered but degraded until Firecrawl allowlist or official feed unlock.
UPDATE public.authorities_sources
SET registry_status = 'degraded',
    feed_url = NULL,
    notes = COALESCE(notes, '') || ' RSS endpoints 403/404 from automated clients; pending Firecrawl allowlist path.',
    updated_at = now()
WHERE domain = 'ods.od.nih.gov';

-- Backbone PubMed/NCBI are not Hub journal sources (no journal_filter).
UPDATE public.authorities_sources
SET lane = 'evidence',
    notes = COALESCE(notes, '') || ' Backbone transport only; not a Research Hub journal cursor.',
    updated_at = now()
WHERE domain IN ('pubmed.ncbi.nlm.nih.gov', 'www.ncbi.nlm.nih.gov');
