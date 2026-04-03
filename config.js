/* =============================================================
   KATTY FLORISTERÍA — config.js  v6.0
   Capa de datos unificada (Railway + Supabase)
   Detecta automáticamente la API y maneja productos.
   ============================================================= */

const KF_CONFIG = (() => {
  // URL de tu servidor en Railway (Backend)
  const RAILWAY_URL = "https://katty-florister-a-production.up.railway.app";
  
  return {
    API_URL: RAILWAY_URL,
    WA_NUMBER: '18294317622',
    STORE_NAME: 'Katty Floristería'
  };
})();

/* ── PRODUCTOS POR DEFECTO (Backup / Primera carga) ───────── */
const KF_DEFAULT_PRODUCTS = {
  tipo: [
    { id:'p001', name:'Arreglo Floral Blanco con Lirios', price:1850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Arreglo+1', desc:'Arreglo floral elegante en canasta con diseño clásico y delicado.', badge:'new', status:'active' },
    { id:'p002', name:'Ramo de 12 Rosas Rojas', price:2850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Rosas+Rojas', desc:'Ramo compuesto por 12 rosas rojas frescas de alta calidad.', badge:'hot', status:'active' },
    { id:'p006', name:'Puchón Premium 300 Rosas', price:8850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=300+Rosas', desc:'Ramo de rosas rojas con aproximadamente 300 flores frescas.', badge:'hot', status:'active' }
  ],
  ocasion: [],
  premium: [],
  oferta: []
};

/* ── FUNCIONES DE DATOS (Prioridad: Servidor Railway) ─────── */

/**
 * Obtiene los productos desde el backend. 
 * Si falla, retorna el localStorage o los defaults.
 */
async function kf_getProducts() {
  try {
    const res = await fetch(`${KF_CONFIG.API_URL}/api/products`, {
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ Datos sincronizados con Supabase");
      return data;
    }
  } catch (e) {
    console.warn("⚠️ Servidor Railway no responde, usando respaldo local:", e.message);
  }

  // Respaldo en caso de que el backend esté caído
  const s = localStorage.getItem('kf_products');
  if (!s) return JSON.parse(JSON.stringify(KF_DEFAULT_PRODUCTS));
  
  try {
    const parsed = JSON.parse(s);
    // Asegurar que todas las categorías existen para evitar errores de render
    const cats = ['tipo','ocasion','premium','oferta'];
    cats.forEach(c => { if (!Array.isArray(parsed[c])) parsed[c] = []; });
    return parsed;
  } catch(e) {
    return JSON.parse(JSON.stringify(KF_DEFAULT_PRODUCTS));
  }
}

/**
 * Guarda los productos en localStorage (como cache rápido)
 */
function kf_saveProducts(p) {
  localStorage.setItem('kf_products', JSON.stringify(p));
  // Disparar timestamp para sincronizar pestañas abiertas
  try { localStorage.setItem('kf_products_ts', Date.now()); } catch(e) {}
}

/**
 * Retorna todos los productos en una sola lista (Array plano)
 */
async function kf_getAllProductsFlat() {
  const p = await kf_getProducts();
  const all = [];
  ['tipo','ocasion','premium','oferta'].forEach(cat => {
    if (Array.isArray(p[cat])) {
      p[cat].forEach(prod => all.push({ ...prod, _cat: cat }));
    }
  });
  return all;
}

/* ── RENDER DE TARJETA DE PRODUCTO ─────────────────────────── */
function kf_renderProductCard(p, showFullName = false) {
  const badge = p.badge
    ? `<div class="product-badge badge-${p.badge}">${p.badge==='new'?'Nuevo':p.badge==='hot'?'🔥 Popular':'% Oferta'}</div>`
    : '';
  
  // Limitar nombre a 4 palabras para estética si no se pide nombre completo
  const displayName = showFullName ? p.name : p.name.split(' ').slice(0,4).join(' ');
  const reviews = Math.floor(Math.random()*180)+20; // Simulación de reseñas
  
  return `
    <div class="product-card" data-id="${p.id}" data-name="${p.name.replace(/"/g,'&quot;')}" data-price="${p.price}">
      <div class="product-image">
        ${badge}
        <img src="${p.img || 'https://placehold.co/400x300/1a1a22/ff4081?text=🌸'}" 
             alt="${p.name}" loading="lazy"
             onerror="this.src='https://placehold.co/400x300/1a1a22/ff4081?text=Imagen+no+disponible'">
      </div>
      <button class="favorite-btn" aria-label="Favorito"><i class="fa-regular fa-heart"></i></button>
      <h4>${displayName}</h4>
      <div class="product-rating">
        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        <i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
        <span>(${reviews})</span>
      </div>
      <p class="product-desc">${p.desc || 'Hermoso arreglo de Katty Floristería.'}</p>
      <div class="price">RD$ ${Number(p.price).toLocaleString('es-DO')}</div>
      <div class="product-actions">
        <input type="number" min="1" value="1" aria-label="Cantidad">
        <button class="add-to-cart">Agregar🛒</button>
      </div>
      <button class="quick-view-btn">👁 Vista rápida</button>
    </div>`;
}

/* ── PASARELAS DE PAGO (PayPal / Stripe) ───────────────────── */

async function kf_loadPaymentConfig() {
  try {
    const res = await fetch(KF_CONFIG.API_URL + '/api/payment-config');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.stripePublishableKey) window.STRIPE_PK = cfg.stripePublishableKey;
      if (cfg.paypalClientId) await kf_loadPayPalSDK(cfg.paypalClientId);
    }
  } catch(e) {
    console.warn('Configuración de pagos no disponible:', e.message);
  }
}

function kf_loadPayPalSDK(clientId) {
  if (!clientId || clientId.startsWith('AXX')) return; 
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
