/* =============================================================
   KATTY FLORISTERÍA — config.js  v5.0
   Detecta automáticamente local vs producción.
   Funciona como capa de datos compartida entre
   index.html, catalogo.html y admin.html
   ============================================================= */

const KF_CONFIG = (() => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  const API_URL = isLocal ?"https://katty-florister-a-production.up.railway.app": window.location.origin;
  return {
    API_URL,
    WA_NUMBER: '18294317622',
    STORE_NAME: 'Katty Floristería'
  };
})();

/* ── PRODUCTOS POR DEFECTO ──────────────────────────────────
   Admin guarda en localStorage['kf_products'].
   index.html y catalogo.html leen de ahí primero.
   ─────────────────────────────────────────────────────────── */
const KF_DEFAULT_PRODUCTS = {
  tipo: [
    { id:'p001', name:'Arreglo Floral Blanco con Lirios',    price:1850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Arreglo+1',  desc:'Arreglo floral elegante en canasta con diseño clásico y delicado.',     badge:'new',  status:'active' },
    { id:'p002', name:'Ramo de 12 Rosas Rojas',              price:2850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Rosas+Rojas', desc:'Ramo compuesto por 12 rosas rojas frescas de alta calidad.',            badge:'hot',  status:'active' },
    { id:'p003', name:'Caja de Corazón de Rosas',            price:2850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Corazon',     desc:'Caja blanca con forma de corazón rellena con rosas rojas.',            badge:'',     status:'active' },
    { id:'p004', name:'Caja Box Arrangement',                price:2850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Box',         desc:'Arreglo moderno en caja cilíndrica negra, sofisticado y decorado.',    badge:'',     status:'active' },
    { id:'p005', name:'Arreglos Tipo Corona',                price:1850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Corona',      desc:'Arreglos florales grandes tipo corona en rojo y blanco.',              badge:'',     status:'active' },
    { id:'p006', name:'Puchón Premium 300 Rosas',            price:8850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=300+Rosas',   desc:'Ramo de rosas rojas con aproximadamente 300 flores frescas.',          badge:'hot',  status:'active' },
    { id:'p007', name:'Arreglo Escultural Rosas y Lirios',   price:2000, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Escultural',  desc:'Diseño arquitectónico que eleva tus momentos especiales.',             badge:'',     status:'active' },
    { id:'p008', name:'Caja de Rosas Redondas',              price:2000, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Redondas',    desc:'Diseño clásico con rosas rojas en caja negra mate.',                  badge:'',     status:'active' },
    { id:'p009', name:'Corazón de Verano: Girasoles y Rosas',price:5500, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Girasoles',   desc:'Corazón de girasoles perfectamente enmarcado.',                        badge:'new',  status:'active' },
    { id:'p010', name:'Corazón de la Realeza',               price:1850, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Realeza',     desc:'Diseño exclusivo en forma de corazón, belleza clásica.',               badge:'',     status:'active' },
  ],
  ocasion: [
    { id:'p011', name:'Arreglo Romántico con Peluche y Globos', price:2400, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Peluche',     desc:'Regalo de amor con oso de peluche, caja y dulces.',                badge:'hot', status:'active' },
    { id:'p012', name:'Arreglo de Cumpleaños Especial',         price:1900, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Cumpleanios', desc:'Arreglo festivo ideal para celebrar el cumpleaños.',               badge:'',    status:'active' },
    { id:'p013', name:'Bouquet San Valentín',                   price:3200, img:'https://placehold.co/400x300/1a1a22/ff4081?text=San+Valentin',desc:'El regalo perfecto para expresar tu amor.',                         badge:'new', status:'active' },
    { id:'p014', name:'Corona Funeraria Elegante',              price:4500, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Corona+Fun', desc:'Arreglo fúnebre de alta calidad para rendir homenaje.',             badge:'',    status:'active' },
  ],
  premium: [
    { id:'p020', name:'Luxury Box Edición Especial',    price:12000, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Luxury+Box',  desc:'Caja de lujo con flores importadas y detalles exclusivos.', badge:'hot',  status:'active' },
    { id:'p021', name:'Edición Limitada – Rosas Azules',price: 9500, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Rosas+Azules',desc:'Rosas azules únicas, disponibles por tiempo limitado.',     badge:'sale', status:'active' },
    { id:'p022', name:'Canasta Premium con Bebidas',    price: 7800, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Canasta',     desc:'Arreglo floral combinado con bebidas de alta gama.',        badge:'new',  status:'active' },
  ],
  oferta: [
    { id:'p030', name:'Docena de Rosas – 20% OFF',      price:1500, img:'https://placehold.co/400x300/1a1a22/ff4081?text=Oferta+Rosas', desc:'¡Aprovecha! Docena de rosas frescas con descuento especial.',  badge:'sale', status:'active' },
    { id:'p031', name:'Arreglo Básico – Oferta del Mes', price:900,  img:'https://placehold.co/400x300/1a1a22/ff4081?text=Basico',      desc:'Arreglo floral sencillo pero elegante a precio especial.',     badge:'sale', status:'active' },
  ]
};

/* ── FUNCIONES COMPARTIDAS DE PRODUCTO ─────────────────────── */
function kf_getProducts() {
  try {
    const s = localStorage.getItem('kf_products');
    if (!s) return JSON.parse(JSON.stringify(KF_DEFAULT_PRODUCTS));
    const parsed = JSON.parse(s);
    // Asegurar que todas las categorías existen
    const cats = ['tipo','ocasion','premium','oferta'];
    cats.forEach(c => { if (!Array.isArray(parsed[c])) parsed[c] = []; });
    return parsed;
  } catch(e) {
    return JSON.parse(JSON.stringify(KF_DEFAULT_PRODUCTS));
  }
}

function kf_saveProducts(p) {
  localStorage.setItem('kf_products', JSON.stringify(p));
  // Disparar evento para que otras páginas (abiertas en otras pestañas) se actualicen
  try { localStorage.setItem('kf_products_ts', Date.now()); } catch(e) {}
}

function kf_getAllProductsFlat() {
  const p = kf_getProducts();
  const all = [];
  ['tipo','ocasion','premium','oferta'].forEach(cat => {
    (p[cat]||[]).forEach(prod => all.push({ ...prod, _cat: cat }));
  });
  return all;
}

/* ── RENDER DE TARJETA DE PRODUCTO ─────────────────────────── */
function kf_renderProductCard(p, showFullName = false) {
  const badge = p.badge
    ? `<div class="product-badge badge-${p.badge}">${p.badge==='new'?'Nuevo':p.badge==='hot'?'🔥 Popular':'% Oferta'}</div>`
    : '';
  const displayName = showFullName ? p.name : p.name.split(' ').slice(0,4).join(' ');
  const reviews = Math.floor(Math.random()*180)+20;
  return `
    <div class="product-card" data-id="${p.id}" data-name="${p.name.replace(/"/g,'&quot;')}" data-price="${p.price}">
      <div class="product-image">
        ${badge}
        <img src="${p.img||'https://placehold.co/400x300/1a1a22/ff4081?text=🌸'}"
             alt="${p.name}" loading="lazy"
             onerror="this.src='https://placehold.co/400x300/1a1a22/ff4081?text=🌸'">
      </div>
      <button class="favorite-btn" aria-label="Favorito"><i class="fa-regular fa-heart"></i></button>
      <h4>${displayName}</h4>
      <div class="product-rating">
        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        <i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
        <span>(${reviews})</span>
      </div>
      <p class="product-desc">${p.desc||''}</p>
      <div class="price">RD$ ${Number(p.price).toLocaleString('es-DO')}</div>
      <div class="product-actions">
        <input type="number" min="1" value="1" aria-label="Cantidad">
        <button class="add-to-cart">Agregar🛒</button>
      </div>
      <button class="quick-view-btn">👁 Vista rápida</button>
    </div>`;
}

/* ── Cargar PayPal SDK dinámicamente ────────────────────────
   Solo se carga en pago.html cuando se necesita.
   El Client ID viene del backend (o puedes hardcodearlo aquí
   para el cliente: PAYPAL_CLIENT_ID es pública, no es secreta)
   ─────────────────────────────────────────────────────────── */
function kf_loadPayPalSDK(clientId) {
  if (!clientId || clientId.startsWith('AXX')) return; // placeholder
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ── Obtener configuración de pagos del backend ─────────────
   Llama a /api/payment-config para obtener claves públicas
   ─────────────────────────────────────────────────────────── */
async function kf_loadPaymentConfig() {
  try {
    const res = await fetch(KF_CONFIG.API_URL + '/api/payment-config', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.stripePublishableKey) window.STRIPE_PK = cfg.stripePublishableKey;
      if (cfg.paypalClientId)       await kf_loadPayPalSDK(cfg.paypalClientId);
    }
  } catch(e) {
    console.warn('Payment config not loaded (backend offline):', e.message);
  }
}
