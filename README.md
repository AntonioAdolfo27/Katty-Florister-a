# 🌸 Katty Floristería v6.0 — Guía de Pagos y Seguimiento

## ¿Qué tiene esta versión?
- 💳 **Stripe** — Pago con tarjeta Visa/Mastercard/Amex (cualquier banco)
- 🅿️ **PayPal** — Pago con cuenta PayPal o tarjeta vinculada
- 🏦 **Transferencia** — Popular, Banreservas, BHD + envío por WhatsApp
- 📦 **Seguimiento tipo Amazon** — El cliente rastrea su pedido en tiempo real
- 🔔 **Admin actualiza estado** — Preparando → En camino → Entregado

---

## Estructura del Proyecto

```
katty_floreria/
├── server.js                ← Backend (Express + Supabase + Stripe)
├── package.json
├── .env                     ← ⚠️ Tus claves privadas (NO subir a GitHub)
├── supabase_schema.sql      ← SQL para crear tablas
└── public/
    ├── index.html           ← Tienda principal
    ├── catalogo.html        ← Catálogo completo
    ├── admin.html           ← Panel de administración
    ├── pago.html            ← Página de pago (Stripe + PayPal + Banco)
    ├── seguimiento.html     ← Rastreo de pedido tipo Amazon
    ├── config.js            ← Configuración compartida
    ├── funciones.js         ← JavaScript del frontend
    ├── stylo.css            ← Estilos principales
    └── catalogo.css         ← Estilos del catálogo
```

---

## PASO 1 — Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
2. Ejecuta el contenido de `supabase_schema.sql`
3. Ve a **Storage** → **New bucket** → nombre: `product-images` → marcar **Public** ✅

---

## PASO 2 — Configurar Stripe (tarjetas)

### 2.1 Crear cuenta
1. Ve a [stripe.com](https://stripe.com) y crea una cuenta gratuita
2. Para República Dominicana, Stripe requiere verificación de identidad y cuenta bancaria

### 2.2 Obtener claves
1. Dashboard → **Developers** → **API keys**
2. Copia la **Publishable key** (`pk_test_...`) y **Secret key** (`sk_test_...`)
3. Para producción, activa tu cuenta y usa las claves `pk_live_...` y `sk_live_...`

### 2.3 Poner las claves en .env
```
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_AQUI
```

### 2.4 Configurar webhook (para confirmar pagos)
1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://tu-dominio.com/api/stripe/webhook`
3. Eventos: `payment_intent.succeeded`
4. Copia el **Signing secret** (`whsec_...`) al .env:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_TU_SECRET_AQUI
   ```

> 💡 **Para recibir el dinero en tu cuenta bancaria:**
> - Ve a Stripe → **Settings** → **Payouts** → conecta tu cuenta bancaria dominicana
> - Stripe transfiere automáticamente a tu cuenta cada 2-7 días hábiles

---

## PASO 3 — Configurar PayPal

### 3.1 Crear cuenta PayPal Business
1. Ve a [paypal.com](https://paypal.com) → Crear cuenta → **Cuenta Negocio**
2. Vincula tu cuenta bancaria (Popular, BHD, Banreservas) o tarjeta

### 3.2 Obtener credenciales de API
1. Ve a [developer.paypal.com](https://developer.paypal.com/dashboard)
2. **My Apps & Credentials** → **Create App**
3. Copia el **Client ID** y **Client Secret**
4. Para pruebas usa **Sandbox**, para producción usa **Live**

### 3.3 Poner las claves en .env
```
PAYPAL_CLIENT_ID=AXXXXXXXXXXXXxxx
PAYPAL_CLIENT_SECRET=EXXXXXXXXXXXXxxx
PAYPAL_MODE=sandbox      # cambiar a "live" en producción
```

> 💡 **Para recibir el dinero:**
> - El dinero queda en tu cuenta PayPal directamente
> - Puedes transferirlo a tu banco dominicano desde la app de PayPal

---

## PASO 4 — Actualizar datos de tus cuentas bancarias

En `public/pago.html`, busca la sección `<!-- TRANSFERENCIA / WHATSAPP PANEL -->` y actualiza los números de cuenta reales:

```html
<div style="color:#888;font-size:.75rem;">Cta. de Ahorros: 800-123456-7</div>
<div style="color:#888;font-size:.75rem;">A nombre de: Katty Martinez</div>
```

---

## PASO 5 — Deploy en Railway

```bash
# 1. Instalar dependencias
npm install

# 2. Subir a GitHub
git init && git add . && git commit -m "v6.0 con pagos"
git push origin main

# 3. En Railway → Variables de entorno, agrega TODAS las del .env
```

**Variables a configurar en Railway:**

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | Tu URL de Supabase |
| `SUPABASE_KEY` | Tu anon key de Supabase |
| `STRIPE_SECRET_KEY` | Tu secret key de Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Tu publishable key de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Tu webhook secret de Stripe |
| `PAYPAL_CLIENT_ID` | Tu Client ID de PayPal |
| `PAYPAL_CLIENT_SECRET` | Tu Client Secret de PayPal |
| `PAYPAL_MODE` | `live` para producción |
| `ALLOWED_ORIGINS` | Tu dominio real |

---

## Cómo funciona el flujo de compra

```
Cliente agrega al carrito
        ↓
Clic en "Finalizar Compra"
        ↓
pago.html — elige método:
  ├─ 💳 Tarjeta → Stripe → Pago procesado → ✅ Confirmado
  ├─ 🅿️ PayPal → PayPal checkout → ✅ Confirmado
  └─ 🏦 Banco → WhatsApp con comprobante → Admin confirma
        ↓
Se genera código de tracking (KF-2025-XXXXX)
        ↓
Cliente va a seguimiento.html?code=KF-2025-XXXXX
        ↓
Admin (admin.html → Pedidos) actualiza estado:
  🌸 Preparando → 🚚 En camino → 🏠 Entregado
        ↓
El cliente ve el cambio en tiempo real
```

---

## Pruebas locales

```bash
npm run dev
```

**Tarjetas de prueba Stripe:**
| Número | Resultado |
|---|---|
| `4242 4242 4242 4242` | ✅ Pago exitoso |
| `4000 0000 0000 9995` | ❌ Tarjeta rechazada |
| `4000 0025 0000 3155` | 🔐 Requiere autenticación 3D |

**PayPal Sandbox:**
- Crea cuentas de prueba en [developer.paypal.com](https://developer.paypal.com/dashboard/accounts)

---

## ¿Cómo actualiza el admin el estado del pedido?

1. Admin → `admin.html` → sección **Pedidos**
2. Cada pedido muestra el código de tracking
3. Usa el selector de estado: **🌸 Preparando** → **🚚 Despachar** → **🏠 Entregado**
4. El cliente verá el cambio automáticamente en `seguimiento.html`

---

## Checklist antes de lanzar

- [ ] Cuentas bancarias reales en `pago.html`
- [ ] Stripe configurado y verificado para DR
- [ ] PayPal Business configurado
- [ ] `supabase_schema.sql` ejecutado
- [ ] Bucket `product-images` creado (público)
- [ ] Todas las variables en Railway
- [ ] Dominio conectado
- [ ] Prueba de pago completa (Stripe test cards)
