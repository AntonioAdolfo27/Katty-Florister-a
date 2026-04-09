// =============================================================
// KATTY FLORISTERÍA — server.js  v7.0
// Nuevas features: Auth Admin seguro, Suscriptores, Promociones
// y envío de email masivo a suscriptores.
// =============================================================



require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const crypto    = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app    = express();
const PORT   = process.env.PORT || 3000;
const BUCKET = 'product-images';

app.set('trust proxy', 1);

// ── Stripe ──────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅  Stripe configurado.');
} else {
  console.warn('⚠️   STRIPE_SECRET_KEY no definida — pagos con tarjeta desactivados.');
}

// ── Supabase ────────────────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌  Faltan SUPABASE_URL o SUPABASE_KEY en .env');
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
console.log('✅  Supabase conectado.');
// Service key para uploads (bypass RLS en Storage)
const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : supabase;
if (process.env.SUPABASE_SERVICE_KEY) console.log('✅  Supabase Admin listo para Storage.');
else console.warn('⚠️  SUPABASE_SERVICE_KEY no definida — uploads pueden fallar.');

// Cliente admin con SERVICE ROLE KEY para uploads de imágenes (bypass RLS)
  : supabase;
if (process.env.SUPABASE_SERVICE_KEY) {
  console.log('✅  Supabase Admin listo para Storage.');
} else {
  console.warn('⚠️   SUPABASE_SERVICE_KEY no definida — uploads pueden fallar.');
}

// ── Nodemailer (email) ───────────────────────────────────────
let mailTransporter = null;
try {
  const nodemailer = require('nodemailer');
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    console.log('✅  Email (SMTP) configurado.');
  } else {
    console.warn('⚠️   SMTP no configurado — envío de email desactivado.');
  }
} catch(e) {
  console.warn('⚠️   nodemailer no instalado. Ejecuta: npm install nodemailer');
}

// =============================================================
// SEGURIDAD — ADMIN AUTH
// =============================================================

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Hash de contraseña con PBKDF2 (sin dependencias externas)
function hashPassword(plain) {
  const salt = process.env.ADMIN_SESSION_SECRET || 'katty-default-salt-2025';
  return crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
}

// Generar token de sesión firmado (expira en 4 horas)
function generateAdminToken() {
  const ts  = Date.now();
  const sig = crypto.createHmac('sha256', SESSION_SECRET)
    .update(`admin:${ts}`)
    .digest('hex');
  return Buffer.from(`admin:${ts}:${sig}`).toString('base64url');
}

// Verificar token
function verifyAdminToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts   = decoded.split(':');
    if (parts.length !== 3 || parts[0] !== 'admin') return false;
    const ts  = parseInt(parts[1]);
    const sig = parts[2];
    // Expirado? (4 horas)
    if (Date.now() - ts > 4 * 60 * 60 * 1000) return false;
    const expected = crypto.createHmac('sha256', SESSION_SECRET)
      .update(`admin:${ts}`)
      .digest('hex');
    return sig === expected;
  } catch { return false; }
}

// Middleware que protege rutas de admin
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = auth.slice(7);
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  next();
}

// Inicializar hash de contraseña en Supabase al arrancar
async function initAdminPassword() {
  const defaultPass = process.env.ADMIN_PASSWORD || 'katty2025';
  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'admin_password_hash')
      .single();

    if (!data || data.value === 'PENDIENTE' || !data.value) {
      const hash = hashPassword(defaultPass);
      await supabase.from('app_config')
        .upsert({ key: 'admin_password_hash', value: hash });
      console.log(`✅  Contraseña admin inicializada (usa: ${defaultPass})`);
    }
  } catch(e) {
    console.warn('⚠️   No se pudo inicializar contraseña admin:', e.message);
  }
}

// ── Seguridad HTTP ───────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const origins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: origins.includes('*') ? '*' : (o, cb) => {
    if (!o || origins.includes(o)) return cb(null, true);
    cb(new Error('CORS bloqueado: ' + o));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','stripe-signature']
}));

// Webhook de Stripe (necesita raw body — va ANTES de express.json)
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 400 }));

// Limitar intentos de login (máx 10 intentos por 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' }
});

// ── Servir frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
// Compatibilidad si los archivos están en la raíz
app.use(express.static(path.join(__dirname)));

// =============================================================
// ADMIN AUTH — Endpoints
// =============================================================

// POST /api/admin/login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Obtener usuario y hash de Supabase
    const { data: usernameRow } = await supabase
      .from('app_config').select('value').eq('key', 'admin_username').single();
    const { data: hashRow } = await supabase
      .from('app_config').select('value').eq('key', 'admin_password_hash').single();

    const storedUser = usernameRow?.value || 'admin';
    const storedHash = hashRow?.value || '';

    if (username !== storedUser) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const inputHash = hashPassword(password);

    // Comparación segura (timing-safe)
    if (!storedHash || inputHash.length !== storedHash.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const match = crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(storedHash)
    );
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = generateAdminToken();
    return res.json({ token, expiresIn: '4h' });

  } catch(err) {
    console.error('admin/login:', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/admin/verify
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

// =============================================================
// CONFIGURACIÓN DEL NEGOCIO
// =============================================================

// GET /api/config — obtener configuración pública (sin contraseña)
app.get('/api/config', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_config').select('key, value');
    if (error) throw error;
    const cfg = {};
    (data || []).forEach(r => {
      if (r.key !== 'admin_password_hash') cfg[r.key] = r.value;
    });
    return res.json(cfg);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// PUT /api/config — actualizar configuración
app.put('/api/config', requireAdmin, async (req, res) => {
  try {
    const allowed = ['store_name','store_phone','store_email','store_address','store_hours','store_hours_sun'];
    const updates = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push({ key, value: String(value) });
      }
    }
    // Cambio de contraseña (opcional)
    if (req.body.new_password) {
      if (req.body.new_password.length < 6) {
        return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });
      }
      updates.push({ key: 'admin_password_hash', value: hashPassword(req.body.new_password) });
    }
    if (updates.length === 0) return res.json({ success: true });

    const { error } = await supabase.from('app_config').upsert(updates, { onConflict: 'key' });
    if (error) throw error;
    return res.json({ success: true });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// SUSCRIPTORES
// =============================================================

// GET /api/subscribers
app.get('/api/subscribers', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// POST /api/subscribers — suscribir email (público, para el formulario de la tienda)
app.post('/api/subscribers', async (req, res) => {
  try {
    const { email, name = '', source = 'web' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const { data, error } = await supabase
      .from('subscribers')
      .upsert([{ email: email.toLowerCase().trim(), name, source }], { onConflict: 'email' })
      .select();
    if (error) throw error;
    return res.status(201).json({ success: true, subscriber: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// DELETE /api/subscribers/:id
app.delete('/api/subscribers/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('subscribers').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// PROMOCIONES
// =============================================================

// GET /api/promotions
app.get('/api/promotions', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// POST /api/promotions
app.post('/api/promotions', requireAdmin, async (req, res) => {
  try {
    const { title, code, discount, description = '' } = req.body;
    if (!title || !code || !discount) {
      return res.status(400).json({ error: 'Título, código y descuento son obligatorios' });
    }
    const { data, error } = await supabase
      .from('promotions')
      .insert([{ title, code: code.toUpperCase().trim(), discount, description }])
      .select();
    if (error) {
      if (error.message.includes('unique')) return res.status(409).json({ error: 'El código ya existe' });
      throw error;
    }
    return res.status(201).json({ success: true, promotion: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// DELETE /api/promotions/:id
app.delete('/api/promotions/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('promotions').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// POST /api/promotions/:id/send-email — Enviar promo a todos los suscriptores activos
app.post('/api/promotions/:id/send-email', requireAdmin, async (req, res) => {
  if (!mailTransporter) {
    return res.status(503).json({ error: 'Email no configurado. Configura SMTP en .env' });
  }
  try {
    // Obtener la promoción
    const { data: promo, error: promoErr } = await supabase
      .from('promotions').select('*').eq('id', req.params.id).single();
    if (promoErr || !promo) return res.status(404).json({ error: 'Promoción no encontrada' });

    // Obtener suscriptores activos
    const { data: subs, error: subsErr } = await supabase
      .from('subscribers').select('email, name').eq('active', true);
    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No hay suscriptores activos' });
    }

    // Obtener nombre de la tienda
    const { data: storeNameRow } = await supabase
      .from('app_config').select('value').eq('key', 'store_name').single();
    const storeName = storeNameRow?.value || 'Katty Floristería';
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    let sent = 0, failed = 0;
    const errors = [];

    // Enviar a cada suscriptor
    for (const sub of subs) {
      const greeting = sub.name ? `Hola ${sub.name}` : 'Hola';
      const html = buildPromoEmail(storeName, promo, greeting);
      try {
        await mailTransporter.sendMail({
          from:    `${storeName} <${fromEmail}>`,
          to:      sub.email,
          subject: `🌸 ${promo.title} — Código: ${promo.code}`,
          html
        });
        sent++;
      } catch(e) {
        failed++;
        errors.push(sub.email);
        console.warn(`Email fallido a ${sub.email}:`, e.message);
      }
      // Pequeña pausa para no saturar el servidor SMTP
      await new Promise(r => setTimeout(r, 80));
    }

    // Registrar en email_logs
    await supabase.from('email_logs').insert([{
      type: 'promo',
      subject: `🌸 ${promo.title} — Código: ${promo.code}`,
      promo_code: promo.code,
      sent_count: sent,
      failed_count: failed,
      status: failed === 0 ? 'sent' : (sent === 0 ? 'failed' : 'partial')
    }]);

    return res.json({
      success: true,
      sent,
      failed,
      total: subs.length,
      message: `Enviado a ${sent} de ${subs.length} suscriptores`
    });

  } catch(err) {
    console.error('send-email promo:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Plantilla HTML del email de promoción ──────────────────
function buildPromoEmail(storeName, promo, greeting) {
  const year = new Date().getFullYear();
  const wa   = process.env.WA_NUMBER || '18294317622';
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${promo.title} — ${storeName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f0f0;padding:20px 0;}
  .wrap{max-width:580px;margin:0 auto;}
  .header{background:linear-gradient(135deg,#c2185b 0%,#ff4081 100%);padding:40px 36px 32px;text-align:center;border-radius:16px 16px 0 0;}
  .logo{font-size:36px;margin-bottom:8px;}
  .header h1{color:#fff;font-size:24px;font-weight:700;letter-spacing:.5px;}
  .header p{color:rgba(255,255,255,.85);font-size:14px;margin-top:6px;}
  .body{background:#fff;padding:36px;}
  .greeting{font-size:16px;color:#333;margin-bottom:16px;}
  .intro{font-size:14px;color:#555;line-height:1.7;margin-bottom:24px;}
  .offer-card{background:linear-gradient(135deg,#fff0f5,#fff8fb);border:2px solid #ffb3c6;border-radius:14px;padding:28px;text-align:center;margin:0 0 24px;}
  .discount-pill{display:inline-block;background:linear-gradient(135deg,#c2185b,#ff4081);color:#fff;padding:10px 28px;border-radius:50px;font-size:20px;font-weight:800;margin-bottom:16px;letter-spacing:.5px;}
  .offer-title{font-size:16px;color:#333;font-weight:600;margin-bottom:8px;}
  .offer-desc{font-size:13px;color:#777;margin-bottom:20px;line-height:1.5;}
  .code-label{font-size:12px;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;}
  .code-box{background:#fff;border:2.5px dashed #c2185b;border-radius:10px;padding:14px 24px;display:inline-block;}
  .code{font-size:28px;font-weight:800;letter-spacing:8px;color:#c2185b;font-family:monospace;}
  .cta-section{text-align:center;margin:24px 0 8px;}
  .cta{display:inline-block;background:linear-gradient(135deg,#c2185b,#ff4081);color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.3px;}
  .cta:hover{opacity:.9;}
  .steps{background:#f9f9f9;border-radius:10px;padding:20px 24px;margin:24px 0;}
  .steps h4{font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;}
  .step{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;}
  .step-num{background:#c2185b;color:#fff;width:22px;height:22px;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
  .step p{font-size:13px;color:#555;line-height:1.5;}
  .disclaimer{font-size:11px;color:#bbb;text-align:center;margin-top:12px;}
  .footer{background:#1a1a1a;padding:24px 36px;text-align:center;border-radius:0 0 16px 16px;}
  .footer p{color:#888;font-size:12px;line-height:1.8;}
  .footer a{color:#ff4081;text-decoration:none;}
  @media(max-width:600px){.header,.body,.steps{padding:24px 20px;}.code{font-size:22px;letter-spacing:4px;}.cta{padding:14px 28px;}}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">🌸</div>
    <h1>${storeName}</h1>
    <p>Tenemos una oferta exclusiva reservada para ti</p>
  </div>
  <div class="body">
    <p class="greeting">${greeting},</p>
    <p class="intro">Como parte de nuestra comunidad especial, queremos compartir contigo esta promoción exclusiva. ¡Es nuestra forma de agradecerte tu preferencia!</p>

    <div class="offer-card">
      <div class="discount-pill">${promo.discount}</div>
      <p class="offer-title">${promo.title}</p>
      <p class="offer-desc">${promo.description || 'Oferta especial por tiempo limitado para nuestros clientes más especiales.'}</p>
      <p class="code-label">Tu código de descuento</p>
      <div class="code-box"><span class="code">${promo.code}</span></div>
    </div>

    <div class="cta-section">
      <a class="cta" href="https://wa.me/${wa}?text=Hola%20${encodeURIComponent(storeName)}!%20Quiero%20usar%20mi%20código%20de%20descuento%3A%20${promo.code}">
        📲 Usar mi descuento por WhatsApp
      </a>
    </div>

    <div class="steps">
      <h4>¿Cómo usar tu código?</h4>
      <div class="step"><div class="step-num">1</div><p>Elige tu arreglo floral favorito de nuestro catálogo</p></div>
      <div class="step"><div class="step-num">2</div><p>Escríbenos por WhatsApp mencionando el código <strong>${promo.code}</strong></p></div>
      <div class="step"><div class="step-num">3</div><p>¡Listo! Aplica el descuento y recibe tu arreglo a domicilio</p></div>
    </div>

    <p class="disclaimer">* Promoción válida por tiempo limitado. Aplica términos y condiciones. No acumulable con otras ofertas.</p>
  </div>
  <div class="footer">
    <p>🌸 <strong style="color:#ff4081">${storeName}</strong></p>
    <p>Recibes este correo porque te suscribiste a nuestro newsletter.</p>
    <p style="margin-top:8px;"><a href="https://wa.me/${wa}">WhatsApp</a> · Santo Domingo, RD</p>
    <p style="margin-top:8px;color:#555;">© ${year} ${storeName}. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;
}

// =============================================================
// STRIPE — PAGOS CON TARJETA
// =============================================================
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe no configurado en el servidor.' });
  try {
    const { amount, currency = 'usd', orderId, customerEmail, metadata = {} } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      receipt_email: customerEmail || undefined,
      metadata: { order_id: orderId || '', store: 'Katty Floristería', ...metadata },
      automatic_payment_methods: { enabled: true }
    });
    return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

async function handleStripeWebhook(req, res) {
  if (!stripe) return res.sendStatus(503);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = process.env.STRIPE_WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      : JSON.parse(req.body.toString());
  } catch(err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    if (pi.metadata?.order_id) {
      await supabase.from('orders')
        .update({ payment_status: 'paid', payment_method: 'stripe', payment_id: pi.id })
        .eq('id', pi.metadata.order_id);
    }
  }
  res.json({ received: true });
}

// =============================================================
// PAYPAL — VERIFICACIÓN
// =============================================================
app.post('/api/paypal/verify', async (req, res) => {
  try {
    const { orderID, orderId } = req.body;
    if (!orderID) return res.status(400).json({ error: 'orderID requerido' });
    const clientId     = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const base = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    if (!clientId || !clientSecret) return res.status(503).json({ error: 'PayPal no configurado.' });

    const tokenRes  = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const orderRes  = await fetch(`${base}/v2/checkout/orders/${orderID}`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const paypalOrder = await orderRes.json();

    if (paypalOrder.status === 'COMPLETED') {
      if (orderId) await supabase.from('orders').update({ payment_status:'paid', payment_method:'paypal', payment_id:orderID }).eq('id', orderId);
      return res.json({ verified: true, status: paypalOrder.status });
    }
    return res.json({ verified: false, status: paypalOrder.status });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// PEDIDOS
// =============================================================
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    let orderData = { ...req.body };
    // Eliminar id para que Supabase lo genere automáticamente (SERIAL)
    delete orderData.id;
    if (typeof orderData.items_json === 'string') { try { orderData.items_json = JSON.parse(orderData.items_json); } catch(e) {} }
    if (!orderData.created_at)        orderData.created_at        = new Date().toISOString();
    if (!orderData.tracking_code)     orderData.tracking_code     = generateTrackingCode();
    if (!orderData.estimated_delivery)orderData.estimated_delivery= getEstimatedDelivery();
    if (!orderData.tracking_steps)    orderData.tracking_steps    = defaultTrackingSteps(orderData.created_at);
    if (!orderData.payment_status)    orderData.payment_status    = 'pending';
    if (!orderData.status)            orderData.status            = 'pending';
    const { data, error } = await supabase.from('orders').insert([orderData]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, order: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/track/:code', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders')
      .select('id,tracking_code,status,payment_status,payment_method,estimated_delivery,tracking_steps,items_json,total,customer_name,created_at')
      .eq('tracking_code', req.params.code.toUpperCase())
      .single();
    if (error || !data) return res.status(404).json({ error: 'Código de seguimiento no encontrado' });
    return res.json(data);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id/tracking', requireAdmin, async (req, res) => {
  try {
    const { step, status } = req.body;
    const { data: order, error: fetchErr } = await supabase.from('orders').select('tracking_steps').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    const steps = order.tracking_steps || [];
    const idx   = steps.findIndex(s => s.step === step);
    if (idx !== -1) { steps[idx].done = true; steps[idx].time = new Date().toISOString(); }
    const updates = { tracking_steps: steps };
    if (status) updates.status = status;
    if (step === 'delivered') { updates.status = 'delivered'; updates.delivered_at = new Date().toISOString(); }
    const { data, error } = await supabase.from('orders').update(updates).eq('id', req.params.id).select();
    if (error) throw error;
    return res.json({ success: true, order: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// PRODUCTOS
// =============================================================
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { name, price, category, desc, description, badge, status, img } = req.body;
    const prodDesc = description || desc || '';
    if (!name || !price || !category) return res.status(400).json({ error: 'Faltan campos' });
    const { data, error } = await supabase.from('products')
      .insert([{ name, price: parseFloat(price), category, description: prodDesc, badge, status: status || 'active', img }]).select();
    if (error) throw error;
    return res.status(201).json({ success: true, product: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const upd = { ...req.body }; delete upd.id; delete upd.created_at;
    const { data, error } = await supabase.from('products').update(upd).eq('id', req.params.id).select();
    if (error) throw error;
    return res.json({ success: true, product: data[0] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// UPLOAD IMAGEN
// =============================================================
app.post('/api/upload', requireAdmin, async (req, res) => {
  try {
    const { name, type, base64 } = req.body;
    if (!base64 || !name || !type) return res.status(400).json({ error: 'Faltan datos' });
    const raw      = base64.includes(';base64,') ? base64.split(';base64,').pop() : base64;
    const buffer   = Buffer.from(raw, 'base64');
    const filePath = `${Date.now()}-${name.replace(/[^a-z0-9._-]/gi,'_').toLowerCase()}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(filePath, buffer, { contentType: type, upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);
    return res.json({ success: true, publicUrl: data.publicUrl });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// =============================================================
// ENDPOINTS PÚBLICOS
// =============================================================
app.get('/api/payment-config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    paypalClientId:       process.env.PAYPAL_CLIENT_ID || null,
    paypalMode:           process.env.PAYPAL_MODE || 'sandbox'
  });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: '7.0', stripe: !!stripe, paypal: !!(process.env.PAYPAL_CLIENT_ID) });
});


// =============================================================
// ANALYTICS — Visitas, Eventos y Productos más vistos en Supabase
// =============================================================

app.post('/api/analytics/visit', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('analytics_visits').select('id,count').eq('date', today).single().catch(() => ({ data: null }));
    if (existing) {
      await supabase.from('analytics_visits').update({ count: existing.count + 1, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('analytics_visits').insert([{ date: today, count: 1 }]);
    }
    return res.json({ success: true });
  } catch(err) { return res.json({ success: false }); }
});

app.post('/api/analytics/event', async (req, res) => {
  try {
    const { event, data = {} } = req.body;
    if (!event) return res.json({ success: false });
    await supabase.from('analytics_events').insert([{ event, data: JSON.stringify(data), created_at: new Date().toISOString() }]);
    return res.json({ success: true });
  } catch(err) { return res.json({ success: false }); }
});

app.post('/api/analytics/product-view', async (req, res) => {
  try {
    const { product_id, product_name } = req.body;
    if (!product_id) return res.json({ success: false });
    const { data: existing } = await supabase.from('analytics_product_views').select('id,count').eq('product_id', String(product_id)).single().catch(() => ({ data: null }));
    if (existing) {
      await supabase.from('analytics_product_views').update({ count: existing.count + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('analytics_product_views').insert([{ product_id: String(product_id), product_name: product_name || '', count: 1 }]);
    }
    return res.json({ success: true });
  } catch(err) { return res.json({ success: false }); }
});

app.get('/api/analytics/summary', requireAdmin, async (req, res) => {
  try {
    const { data: visits } = await supabase.from('analytics_visits').select('date,count').order('date', { ascending: false }).limit(30);
    const { data: events } = await supabase.from('analytics_events').select('event').limit(2000);
    const eventCounts = {};
    (events || []).forEach(e => { eventCounts[e.event] = (eventCounts[e.event] || 0) + 1; });
    const totalVisits = (visits || []).reduce((a, v) => a + (v.count || 0), 0);
    const { data: topProducts } = await supabase.from('analytics_product_views').select('product_id,product_name,count').order('count', { ascending: false }).limit(8);
    return res.json({ visits: visits || [], totalVisits, events: eventCounts, topProducts: topProducts || [] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

// ── Fallback SPA ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================================
// UTILIDADES
// =============================================================
function generateTrackingCode() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KF-${year}-${rand}`;
}
function getEstimatedDelivery() {
  const d = new Date(); let days = 0;
  while (days < 2) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) days++; }
  return d.toISOString();
}
function defaultTrackingSteps(createdAt) {
  const created   = new Date(createdAt);
  const confirmed = new Date(created.getTime() + 30 * 60 * 1000);
  const preparing = new Date(created.getTime() + 2 * 60 * 60 * 1000);
  const dispatch  = new Date(created.getTime() + 4 * 60 * 60 * 1000);
  return [
    { step:'confirmed',  label:'✅ Pedido confirmado',     time: confirmed.toISOString(), done: true  },
    { step:'preparing',  label:'🌸 Preparando tu arreglo', time: preparing.toISOString(), done: false },
    { step:'dispatched', label:'🚚 En camino',             time: dispatch.toISOString(),  done: false },
    { step:'delivered',  label:'🏠 Entregado',             time: null,                    done: false },
  ];
}

// =============================================================
// ARRANCAR SERVIDOR
// =============================================================
app.listen(PORT, async () => {
  console.log(`🚀  http://localhost:${PORT}`);
  console.log(`💳  Stripe: ${stripe ? 'ON' : 'OFF'}`);
  console.log(`💰  PayPal: ${process.env.PAYPAL_CLIENT_ID ? 'ON' : 'OFF'}`);
  console.log(`📧  Email:  ${mailTransporter ? 'ON' : 'OFF'}`);
  await initAdminPassword();
});