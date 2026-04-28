-- Pack price on supply catalog
-- Lets users record what a pack/container costs without registering a
-- purchase, so the profitability calculator can derive a per-unit cost
-- (pack_price / unit_size) even before any purchase is loaded.

ALTER TABLE supply_catalog ADD COLUMN IF NOT EXISTS pack_price NUMERIC;
