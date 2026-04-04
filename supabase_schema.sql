-- =============================================================
-- KATTY FLORISTERÍA — Supabase Schema v6.0 (con pagos)
-- Ejecuta en: Supabase Dashboard > SQL Editor > New query
-- =============================================================

-- ── Tabla products ──────────────────────────────────────────
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

-- ── Tabla orders (con pagos y seguimiento) ──────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  -- Cliente
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT DEFAULT '',
  customer_address  TEXT NOT NULL,
  customer_note     TEXT DEFAULT '',
  -- Pedido
  items_json        JSONB DEFAULT '[]',
  total             NUMERIC(10,2) DEFAULT 0,
  -- Pago
  payment_method    TEXT DEFAULT 'pending'
                    CHECK (payment_method IN ('stripe','paypal','transfer','whatsapp','pending')),
  payment_status    TEXT DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_id        TEXT DEFAULT '',        -- Stripe/PayPal transaction ID
  -- Estado y seguimiento
  status            TEXT DEFAULT 'confirmed'
                    CHECK (status IN ('pending','confirmed','preparing','dispatched','delivered','cancelled')),
  tracking_code     TEXT UNIQUE,
  tracking_steps    JSONB DEFAULT '[]',
  estimated_delivery TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  date              TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_all"  ON products;
DROP POLICY IF EXISTS "orders_all"    ON orders;
DROP POLICY IF EXISTS "orders_track"  ON orders;

-- Productos: lectura pública
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);

-- Pedidos: solo backend puede leer/escribir todo
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);

-- ── Verificar ───────────────────────────────────────────────
SELECT 'products' as tabla, count(*) as filas FROM products
UNION ALL SELECT 'orders', count(*) FROM orders;
