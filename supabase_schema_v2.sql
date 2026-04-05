-- =============================================================
-- KATTY FLORISTERÍA — Supabase Schema v7.0 (NUEVAS TABLAS)
-- Ejecuta esto en: Supabase Dashboard > SQL Editor > New query
-- Este archivo AGREGA tablas nuevas. Las tablas ya existentes
-- (products, orders) NO se tocan.
-- =============================================================

-- ────────────────────────────────────────────────────────────
-- TABLA: subscribers  (suscriptores al newsletter)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT DEFAULT '',
  active     BOOLEAN DEFAULT TRUE,
  source     TEXT DEFAULT 'web',      -- 'web', 'admin', 'import'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email  ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);

-- ────────────────────────────────────────────────────────────
-- TABLA: promotions  (códigos de descuento)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  discount   TEXT NOT NULL,           -- '20%', 'RD$ 500', etc.
  description TEXT DEFAULT '',
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);

-- ────────────────────────────────────────────────────────────
-- TABLA: app_config  (configuración general del negocio y admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_app_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_config_ts ON app_config;
CREATE TRIGGER trg_app_config_ts
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_config_timestamp();

-- Insertar valores por defecto (se actualizan desde el panel Admin)
-- ⚠️  IMPORTANTE: La contraseña del admin se configura desde el .env
--    El hash se genera automáticamente al iniciar el servidor.
INSERT INTO app_config (key, value) VALUES
  ('store_name',    'Katty Floristería'),
  ('store_phone',   '+1 829-431-7622'),
  ('store_email',   'kattyfloristeria@gmail.com'),
  ('store_address', 'Av. México 44, Santo Domingo 10211, RD'),
  ('store_hours',   '8:00 AM – 8:00 PM (Lun–Sáb)'),
  ('store_hours_sun','9:00 AM – 3:00 PM (Dom)'),
  ('admin_username','admin'),
  ('admin_password_hash', 'PENDIENTE')  -- El servidor lo reemplaza al iniciar
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- TABLA: email_logs  (historial de emails enviados)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL,          -- 'promo', 'order_confirm', etc.
  subject      TEXT NOT NULL DEFAULT '',
  promo_code   TEXT DEFAULT '',
  sent_count   INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'sent'
                CHECK (status IN ('sent','failed','partial')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY  (todas las tablas nuevas)
-- ────────────────────────────────────────────────────────────
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs  ENABLE ROW LEVEL SECURITY;

-- Política: solo el backend (anon key) puede leer/escribir todo
-- (el backend usa la SERVICE_ROLE_KEY o la ANON_KEY con RLS permisivo
--  mientras las rutas del servidor ya están protegidas con requireAdmin)
DROP POLICY IF EXISTS "subs_all"   ON subscribers;
DROP POLICY IF EXISTS "promos_all" ON promotions;
DROP POLICY IF EXISTS "config_all" ON app_config;
DROP POLICY IF EXISTS "logs_all"   ON email_logs;

CREATE POLICY "subs_all"   ON subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "promos_all" ON promotions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "config_all" ON app_config  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "logs_all"   ON email_logs  FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name AND table_schema = 'public') AS columnas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('products','orders','subscribers','promotions','app_config','email_logs')
ORDER BY table_name;
