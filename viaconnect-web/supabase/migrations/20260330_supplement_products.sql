-- Supplement Products Database for Smart Search (Tier 1)
-- Full-text search enabled for instant brand/product matching

create table if not exists supplement_products (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null,
  product_name text not null,
  formulation text,
  category text not null,
  dosage_form text,
  typical_dosage text,
  key_ingredients text[],
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(brand_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(product_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(formulation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) stored,
  is_farmceutica boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_supplement_products_search on supplement_products using gin(search_vector);
create index if not exists idx_supplement_products_brand on supplement_products (brand_name);

-- RLS
alter table supplement_products enable row level security;

create policy "Anyone can read supplement products" on supplement_products
  for select using (true);
