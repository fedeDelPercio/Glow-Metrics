-- ============================================
-- GlowMetrics — Schema inicial completo
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- FUNCIÓN: update_updated_at (reutilizable)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLA: profiles (extiende auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  currency TEXT DEFAULT 'ARS',
  working_hours JSONB DEFAULT '{
    "monday":    {"start":"09:00","end":"18:00","active":true},
    "tuesday":   {"start":"09:00","end":"18:00","active":true},
    "wednesday": {"start":"09:00","end":"18:00","active":true},
    "thursday":  {"start":"09:00","end":"18:00","active":true},
    "friday":    {"start":"09:00","end":"18:00","active":true},
    "saturday":  {"start":"09:00","end":"13:00","active":true},
    "sunday":    {"start":"09:00","end":"13:00","active":false}
  }'::jsonb,
  slot_duration_minutes INT DEFAULT 30,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- FUNCIÓN: crear perfil al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TABLA: service_categories
-- ============================================
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_service_categories
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories_select" ON service_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_categories_insert" ON service_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_categories_update" ON service_categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service_categories_delete" ON service_categories FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLA: services
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_services_user ON services(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_category ON services(category_id);

CREATE TRIGGER set_updated_at_services
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "services_update" ON services FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "services_delete" ON services FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLA: service_price_history
-- ============================================
CREATE TABLE IF NOT EXISTS service_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_history_select" ON service_price_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_price_history.service_id
    AND services.user_id = auth.uid()
  ));

CREATE POLICY "price_history_insert" ON service_price_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_price_history.service_id
    AND services.user_id = auth.uid()
  ));

-- ============================================
-- TRIGGER: registrar cambio de precio
-- ============================================
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO service_price_history (service_id, price)
    VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_price_change
  AFTER UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- ============================================
-- TABLA: supply_catalog
-- ============================================
CREATE TABLE IF NOT EXISTS supply_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL,
  unit_size NUMERIC(10,2),
  current_stock NUMERIC(10,2) DEFAULT 0,
  min_stock_alert NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supply_catalog_user ON supply_catalog(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_supply_catalog
  BEFORE UPDATE ON supply_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE supply_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_catalog_select" ON supply_catalog FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "supply_catalog_insert" ON supply_catalog FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "supply_catalog_update" ON supply_catalog FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "supply_catalog_delete" ON supply_catalog FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLA: service_supplies (receta)
-- ============================================
CREATE TABLE IF NOT EXISTS service_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES supply_catalog(id) ON DELETE CASCADE,
  quantity_per_session NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, supply_id)
);

CREATE INDEX idx_service_supplies_service ON service_supplies(service_id);

CREATE TRIGGER set_updated_at_service_supplies
  BEFORE UPDATE ON service_supplies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE service_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_supplies_select" ON service_supplies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_supplies.service_id
    AND services.user_id = auth.uid()
  ));

CREATE POLICY "service_supplies_insert" ON service_supplies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_supplies.service_id
    AND services.user_id = auth.uid()
  ));

CREATE POLICY "service_supplies_update" ON service_supplies FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_supplies.service_id
    AND services.user_id = auth.uid()
  ));

CREATE POLICY "service_supplies_delete" ON service_supplies FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_supplies.service_id
    AND services.user_id = auth.uid()
  ));

-- ============================================
-- TABLA: supply_purchases
-- ============================================
CREATE TABLE IF NOT EXISTS supply_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES supply_catalog(id) ON DELETE CASCADE,
  supplier_name TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supply_purchases_user_date ON supply_purchases(user_id, purchase_date) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_supply_purchases
  BEFORE UPDATE ON supply_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE supply_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_purchases_select" ON supply_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "supply_purchases_insert" ON supply_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "supply_purchases_update" ON supply_purchases FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "supply_purchases_delete" ON supply_purchases FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: actualizar stock en compra
-- ============================================
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE supply_catalog
  SET current_stock = current_stock + NEW.quantity
  WHERE id = NEW.supply_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_update_on_purchase
  AFTER INSERT ON supply_purchases
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();

-- Restar stock si se elimina una compra (soft delete no aplica acá, es trigger de DELETE real)
CREATE OR REPLACE FUNCTION revert_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE supply_catalog
    SET current_stock = GREATEST(0, current_stock - OLD.quantity)
    WHERE id = OLD.supply_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_revert_on_purchase_delete
  AFTER UPDATE ON supply_purchases
  FOR EACH ROW EXECUTE FUNCTION revert_stock_on_purchase_delete();

-- ============================================
-- TABLA: clients
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  notes TEXT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_clients_user ON clients(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name ON clients USING gin(to_tsvector('spanish', full_name)) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLA: appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','confirmed','completed','no_show','cancelled','rescheduled')),
  source TEXT,
  price_charged NUMERIC(12,2),
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_appointments_user_date ON appointments(user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_user_status ON appointments(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_client ON appointments(client_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLA: fixed_costs
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  frequency TEXT DEFAULT 'monthly'
    CHECK (frequency IN ('monthly','bimonthly','quarterly','annual')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_fixed_costs_user ON fixed_costs(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_fixed_costs
  BEFORE UPDATE ON fixed_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_costs_select" ON fixed_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_costs_insert" ON fixed_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_costs_update" ON fixed_costs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_costs_delete" ON fixed_costs FOR DELETE USING (auth.uid() = user_id);
