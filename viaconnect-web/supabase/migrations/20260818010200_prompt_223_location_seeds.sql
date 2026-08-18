-- Prompt 223 location reference seeds.
-- Sources and licenses:
--   ISO 3166-1/2 country and subdivision codes: ISO standard codes with English short names.
--   Natural Earth 10m populated places: public domain, https://www.naturalearthdata.com
--   US Census Gazetteer / incorporated places: public domain, https://www.census.gov
-- is_free_entry_origin is false on all seed rows.
-- No coordinates are stored.

-- Launch-market countries. Full ISO 3166-1 list is in the sibling file.

INSERT INTO public.ref_countries (code, name, name_normalized)
VALUES
  ('AU', 'Australia', 'australia'),
  ('CA', 'Canada', 'canada'),
  ('US', 'United States of America', 'united states of america')
ON CONFLICT (code) DO NOTHING;
