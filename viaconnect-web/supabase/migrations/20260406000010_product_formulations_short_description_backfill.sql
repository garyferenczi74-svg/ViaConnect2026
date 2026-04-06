-- Backfill short_description for products that already have formulation_json
-- but are missing the marketing description. Only updates rows where
-- short_description IS NULL so existing values are never overwritten.
--
-- Source: ViaConnect Prompt #49d (Shop Description + Formulation drop-downs).
-- The product_catalog.short_description and product_catalog.formulation_json
-- columns already existed in the database when this migration was authored;
-- this file only seeds missing marketing copy.

UPDATE product_catalog SET short_description = 'Comprehensive liver detox and methylation support complex'
  WHERE name = 'Clean+ Detox & Liver Health' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Female hormonal balance and libido support complex'
  WHERE name = 'DESIRE+ Female Hormonal' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Full-spectrum digestive enzyme complex for malabsorption and gut health'
  WHERE name = 'DigestiZorb+ Enzyme Complex' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Joint mobility and inflammation support with Boswellia and Collagen'
  WHERE name = 'FLEX+ Joint & Inflammation' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Cognitive performance stack with Lion''s Mane, Bacopa, and Alpha-GPC'
  WHERE name = 'FOCUS+ Nootropic Formula' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Complete prenatal formula with methylated folate and essential nutrients'
  WHERE name = 'Grow+ Pre-Natal Formula' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Multi-enzyme histamine clearance and mast cell stabilization formula'
  WHERE name = 'Histamine Relief Protocol' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Comprehensive iron support with cofactors for red blood cell production'
  WHERE name = 'IRON+ Red Blood Cell Support' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Advanced neurotransmitter and BH4 cofactor complex for cognitive health'
  WHERE name = 'NeuroCalm BH4+ (Advanced)' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Postnatal recovery and hormonal rebalancing complex'
  WHERE name = 'Revitalizher Postnatal+' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Natural testosterone support with Tongkat Ali, Fadogia, and zinc complex'
  WHERE name = 'RISE+ Male Testosterone' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Complete infant nutrition tincture with liposomal delivery for maximum absorption'
  WHERE name = 'Sproutables Infant Tincture' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Age-appropriate toddler multivitamin with essential nutrients for development'
  WHERE name = 'Sproutables Toddler Tablets' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Delicious children''s gummies with methylated vitamins and mineral support'
  WHERE name = 'Sproutables Children Gummies' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Telomere length and cellular longevity support matrix'
  WHERE name = 'Teloprime+ Telomere Support' AND short_description IS NULL;

UPDATE product_catalog SET short_description = 'Post-natal metabolic support with GLP-1 activating compounds'
  WHERE name = 'Thrive+ Post-Natal GLP-1' AND short_description IS NULL;
