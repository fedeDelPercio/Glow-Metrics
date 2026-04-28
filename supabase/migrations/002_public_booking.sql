-- Public online booking
-- Adds a unique slug per profile so each professional can publish a public
-- booking page at /r/<slug>. The Server Actions that power the public page
-- bypass RLS using service-role; the schema only needs the slug + a kill
-- switch to disable bookings.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_slug TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepts_online_booking BOOLEAN DEFAULT true;

-- Lowercase, alphanumeric + dashes, 3-50 chars, can't start with a dash
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_public_slug_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_public_slug_format
  CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9][a-z0-9-]{2,49}$');

-- Unique partial index so multiple NULLs are allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_public_slug
  ON profiles (public_slug)
  WHERE public_slug IS NOT NULL AND deleted_at IS NULL;

-- Marker on appointments for bookings created via the public page. Existing
-- `source` column is reused for marketing channel; this flag is orthogonal.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_via TEXT;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_booked_via_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_booked_via_check
  CHECK (booked_via IS NULL OR booked_via IN ('public', 'manual'));

-- Backfill: derive slug from existing business_name + first 4 chars of id
CREATE EXTENSION IF NOT EXISTS unaccent;
UPDATE profiles
SET public_slug = (
  SELECT
    CASE
      WHEN length(trim(both '-' from base)) >= 3
      THEN trim(both '-' from base) || '-' || substring(profiles.id::text, 1, 4)
      ELSE 'salon-' || substring(profiles.id::text, 1, 8)
    END
  FROM (SELECT regexp_replace(lower(unaccent(business_name)), '[^a-z0-9]+', '-', 'g') AS base) b
)
WHERE public_slug IS NULL AND business_name IS NOT NULL;
