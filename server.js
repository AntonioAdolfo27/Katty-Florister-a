// =============================================================
// KATTY FLORISTERÍA — server.js  v5.0
// Backend Express + Supabase. Sirve el frontend desde /public
// Rutas: /api/status  /api/products  /api/orders  /api/upload
// =============================================================

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const { createClient } = require('@supabase/supabase-js');

const app    = express();
const PORT   = process.env.PORT || 3000;
const BUCKET = 'product-images';

// ── Validar credenciales obligatorias ──────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌  Faltan SUPABASE_URL o SUPABASE_KEY en .env');
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
console.log('✅  Supabase conectado.');

// ── Seguridad ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqueado: ' + origin));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true }));

// ── Servir frontend estático desde /public ──────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════

app.get('/api/status', (req, res) => {
  res.json({ app: 'Katty Floristería API', version: '5.0', status: 'online' });
});

// ── PRODUCTOS ───────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category, desc, badge, status, img } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: 'Nombre, precio y categoría requeridos' });
    const { data, error } = await supabase.from('products')
      .insert([{ name, price: parseFloat(price), category, desc, badge, status: status || 'active', img }])
      .select();
    if (error) throw error;
    return res.status(201).json({ success: true, product: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id; delete updates.created_at;
    const { data, error } = await supabase.from('products').update(updates).eq('id', req.params.id).select();
    if (error) throw error;
    return res.json({ success: true, product: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// ── PEDIDOS ─────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    let orderData = { ...req.body };
    if (orderData.items_json && typeof orderData.items_json === 'string') {
      try { orderData.items_json = JSON.parse(orderData.items_json); } catch(e) {}
    }
    if (!orderData.created_at) orderData.created_at = new Date().toISOString();
    const { data, error } = await supabase.from('orders').insert([orderData]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, order: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// ── UPLOAD IMAGEN ───────────────────────────────────────────
app.post('/api/upload', async (req, res) => {
  try {
    const { name, type, base64 } = req.body;
    if (!base64 || !name || !type) return res.status(400).json({ error: 'Faltan base64, name o type' });

    const raw      = base64.includes(';base64,') ? base64.split(';base64,').pop() : base64;
    const buffer   = Buffer.from(raw, 'base64');
    const safeName = name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const filePath = `${Date.now()}-${safeName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(filePath, buffer, { contentType: type, upsert: false });
    if (upErr) throw new Error(`Storage: ${upErr.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return res.json({ success: true, fileName: filePath, publicUrl: urlData.publicUrl });
  } catch(err) {
    console.error('Upload error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Fallback SPA ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Arrancar ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  http://localhost:${PORT}`);
  console.log(`📁  Frontend: ${path.join(__dirname, 'public')}`);
  console.log(`📦  Bucket imágenes: "${BUCKET}" (debe ser público en Supabase)`);
});
