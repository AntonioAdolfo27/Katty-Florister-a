/* =============================================================
   KATTY FLORISTERÍA — server.js  v6.1 (CORREGIDO PARA RAILWAY)
   Pagos: Stripe + PayPal + Seguimiento + Fix Proxy
   ============================================================= */

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

// CONFIGURACIÓN CRUCIAL PARA RAILWAY: Confiar en el proxy
app.set('trust proxy', 1);

// ── Stripe (tarjetas internacionales Visa/MC) ───────────────
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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('✅  Supabase conectado.');

// ── Seguridad ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

const origins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim());

app.use(
  cors({
    origin: origins.includes('*')
      ? '*'
      : (o, cb) => {
          if (!o || origins.includes(o)) return cb(null, true);
          cb(new Error('CORS bloqueado: ' + o));
        },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'stripe-signature'
    ]
  })
);

// Webhook Stripe
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Rate limit Railway
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    validate: { xForwardedForHeader: false }
  })
);

// ── Servir frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

function generateTrackingCode() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KF-${year}-${rand}`;
}

function getEstimatedDelivery() {
  const now = new Date();
  let days = 0;
  const d = new Date(now);

  while (days < 2) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();

    if (dow !== 0) days++;
  }

  return d.toISOString();
}

function defaultTrackingSteps(createdAt) {
  const created = new Date(createdAt);

  const confirmed = new Date(created.getTime() + 30 * 60 * 1000);
  const preparing = new Date(created.getTime() + 2 * 60 * 60 * 1000);
  const dispatch  = new Date(created.getTime() + 4 * 60 * 60 * 1000);

  return [
    {
      step: 'confirmed',
      label: '✅ Pedido confirmado',
      time: confirmed.toISOString(),
      done: true
    },
    {
      step: 'preparing',
      label: '🌸 Preparando tu arreglo',
      time: preparing.toISOString(),
      done: false
    },
    {
      step: 'dispatched',
      label: '🚚 En camino',
      time: dispatch.toISOString(),
      done: false
    },
    {
      step: 'delivered',
      label: '🏠 Entregado',
      time: null,
      done: false
    }
  ];
}

// =============================================================
// STRIPE
// =============================================================

app.post('/api/stripe/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe no configurado en el servidor.'
    });
  }

  try {
    const {
      amount,
      currency = 'usd',
      orderId,
      customerEmail,
      metadata = {}
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Monto inválido'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      receipt_email: customerEmail || undefined,
      metadata: {
        order_id: orderId || '',
        store: 'Katty Floristería',
        ...metadata
      },
      automatic_payment_methods: { enabled: true }
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function handleStripeWebhook(req, res) {
  if (!stripe) return res.sendStatus(503);

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const orderId = pi.metadata?.order_id;

    if (orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: 'stripe',
          payment_id: pi.id
        })
        .eq('id', orderId);
    }
  }

  res.json({ received: true });
}

// =============================================================
// PRODUCTS (🔥 CORREGIDO)
// =============================================================

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const {
      id,
      name,
      price,
      category,
      description,
      desc,
      badge,
      status,
      img
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    const productData = {
      id: id || `p${Date.now()}`,
      name,
      price: parseFloat(price),
      category,
      description: description || desc || '',
      badge: badge || '',
      status: status || 'active',
      img: img || ''
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      product: data[0]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const upd = { ...req.body };

    delete upd.id;
    delete upd.created_at;

    if (upd.desc && !upd.description) {
      upd.description = upd.desc;
      delete upd.desc;
    }

    if (upd.price) {
      upd.price = parseFloat(upd.price);
    }

    const { data, error } = await supabase
      .from('products')
      .update(upd)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      product: data[0]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    return res.json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================
// STATUS
// =============================================================

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '6.1',
    stripe: !!stripe,
    supabase: !!supabase
  });
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀  Server running on port ${PORT}`);
});