-- =============================================================
-- KATTY FLORISTERÍA — Supabase SQL Schema v5.0
-- Ejecuta esto en: Supabase Dashboard > SQL Editor > New query
-- =============================================================

-- ── Tabla: products ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('tipo','ocasion','premium','oferta')),
  desc        TEXT DEFAULT '',
  badge       TEXT DEFAULT '',
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','draft','inactive')),
  img         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: orders ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT DEFAULT '',
  customer_address TEXT NOT NULL,
  items_json       JSONB DEFAULT '[]',
  total            NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  date             TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública del catálogo
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);

-- Permitir escritura desde el backend (anon key)
DROP POLICY IF EXISTS "products_all" ON products;
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_all" ON orders;
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);

-- ── Verificar que todo esté OK ───────────────────────────────
SELECT 'products' as tabla, count(*) as filas FROM products
UNION ALL
SELECT 'orders', count(*) FROM orders;
