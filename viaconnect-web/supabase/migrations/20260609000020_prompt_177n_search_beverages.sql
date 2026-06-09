-- Prompt 177n (2026-06-09): search_beverages RPC.
--
-- Parity with the search_supplements / global_product_search shape used
-- by the meal and NutriVision search flows. The Search beverages box
-- on the hydration screen was previously filtering on display_name
-- only via picker-state.searchCatalog, which is why "cof" missed
-- Espresso Shot and Americano (their display_name does not contain
-- "cof"; their category does). This RPC + the matching client side
-- ranking surface the coffee family on a category prefix.
--
-- The hydration screen still runs the client side filter against the
-- pre loaded catalog (49 rows; instant, no network round trip). This
-- RPC exists so any future surface that needs to search beverages
-- without holding the full catalog can call the same shape every
-- other search RPC in the project uses. No trigram index per spec
-- guardrails because the table is 49 rows.

create or replace function public.search_beverages(search_query text, result_limit integer default 15)
returns table(
  id uuid, slug text, display_name text, category text,
  default_volume_ml integer, hydration_coefficient numeric,
  caffeine_mg_per_serving integer, is_alcoholic boolean, match_score integer
)
language sql stable
set search_path to 'public', 'pg_temp'
as $$
  select bc.id, bc.slug, bc.display_name, bc.category, bc.default_volume_ml,
         bc.hydration_coefficient, bc.caffeine_mg_per_serving, bc.is_alcoholic,
         (case
            when lower(bc.display_name) like lower(search_query) || '%'        then 100
            when lower(bc.display_name) like '%' || lower(search_query) || '%' then 70
            when lower(bc.category)     like '%' || lower(search_query) || '%' then 50
            when lower(bc.slug)         like '%' || lower(search_query) || '%' then 40
            else 10
          end) as match_score
  from public.beverage_catalog bc
  where bc.is_active = true
    and (lower(bc.display_name) like '%' || lower(search_query) || '%'
         or lower(bc.category)  like '%' || lower(search_query) || '%'
         or lower(bc.slug)      like '%' || lower(search_query) || '%')
  order by match_score desc, bc.sort_order, bc.display_name
  limit result_limit;
$$;

grant execute on function public.search_beverages(text, integer) to authenticated;
