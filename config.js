/* =============================================================
   KATTY FLORISTERÍA — config.js  v7.0 FIXED
   Capa de datos unificada (LocalStorage + Railway)
   ============================================================= */

const KF_CONFIG = (() => {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "";

  const API_URL = isLocal
    ? "https://katty-florister-a-production.up.railway.app"
    : window.location.origin;

  return {
    API_URL,
    WA_NUMBER: "18294317622",
    STORE_NAME: "Katty Floristería"
  };
})();

/* =============================================================
   PRODUCTOS POR DEFECTO
   ============================================================= */
const KF_DEFAULT_PRODUCTS = {
  tipo: [
    {
      id: "p001",
      name: "Arreglo Floral Blanco con Lirios",
      price: 1850,
      img: "https://placehold.co/400x300/1a1a22/ff4081?text=Arreglo+1",
      desc: "Arreglo floral elegante en canasta con diseño clásico y delicado.",
      badge: "new",
      status: "active"
    },
    {
      id: "p002",
      name: "Ramo de 12 Rosas Rojas",
      price: 2850,
      img: "https://placehold.co/400x300/1a1a22/ff4081?text=Rosas+Rojas",
      desc: "Ramo compuesto por 12 rosas rojas frescas de alta calidad.",
      badge: "hot",
      status: "active"
    }
  ],
  ocasion: [],
  premium: [],
  oferta: []
};

/* =============================================================
   FUNCIÓN PRINCIPAL DE PRODUCTOS
   PRIORIDAD:
   1) localStorage
   2) Railway
   3) defaults
   ============================================================= */
async function kf_getProducts() {
  try {
    const localData = localStorage.getItem("kf_products");

    if (localData) {
      const parsed = JSON.parse(localData);

      ["tipo", "ocasion", "premium", "oferta"].forEach(cat => {
        if (!Array.isArray(parsed[cat])) {
          parsed[cat] = [];
        }
      });

      return parsed;
    }
  } catch (error) {
    console.warn("Error leyendo localStorage:", error);
  }

  try {
    const res = await fetch(`${KF_CONFIG.API_URL}/api/products`, {
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();

      const grouped = {
        tipo: [],
        ocasion: [],
        premium: [],
        oferta: []
      };

      data.forEach(product => {
        const category = product.category || "tipo";

        if (grouped[category]) {
          grouped[category].push({
            ...product,
            desc: product.description || product.desc || "",
            status: product.status || "active"
          });
        }
      });

      localStorage.setItem(
        "kf_products",
        JSON.stringify(grouped)
      );

      return grouped;
    }
  } catch (error) {
    console.warn("Servidor no disponible:", error.message);
  }

  localStorage.setItem(
    "kf_products",
    JSON.stringify(KF_DEFAULT_PRODUCTS)
  );

  return JSON.parse(JSON.stringify(KF_DEFAULT_PRODUCTS));
}

/* =============================================================
   GUARDAR PRODUCTOS
   ============================================================= */
function kf_saveProducts(products) {
  if (!products) return;

  ["tipo", "ocasion", "premium", "oferta"].forEach(cat => {
    if (!Array.isArray(products[cat])) {
      products[cat] = [];
    }
  });

  localStorage.setItem(
    "kf_products",
    JSON.stringify(products)
  );

  localStorage.setItem(
    "kf_products_ts",
    Date.now()
  );

  console.log("✅ Productos guardados correctamente");
}

/* =============================================================
   OBTENER PRODUCTOS PLANOS
   ============================================================= */
async function kf_getAllProductsFlat() {
  const grouped = await kf_getProducts();

  const all = [];

  ["tipo", "ocasion", "premium", "oferta"].forEach(cat => {
    grouped[cat].forEach(product => {
      all.push({
        ...product,
        _cat: cat
      });
    });
  });

  return all;
}

/* =============================================================
   RENDER CARD
   ============================================================= */
function kf_renderProductCard(product, showFullName = false) {
  const badge = product.badge
    ? `<div class="product-badge badge-${product.badge}">
        ${
          product.badge === "new"
            ? "Nuevo"
            : product.badge === "hot"
            ? "🔥 Popular"
            : "% Oferta"
        }
      </div>`
    : "";

  const displayName = showFullName
    ? product.name
    : product.name.split(" ").slice(0, 4).join(" ");

  const reviews = Math.floor(Math.random() * 180) + 20;

  return `
    <div class="product-card"
         data-id="${product.id}"
         data-name="${product.name.replace(/"/g, "&quot;")}"
         data-price="${product.price}">

      <div class="product-image">
        ${badge}
        <img
          src="${product.img || "https://placehold.co/400x300"}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x300/1a1a22/ff4081?text=Sin+imagen'"
        >
      </div>

      <button class="favorite-btn">
        <i class="fa-regular fa-heart"></i>
      </button>

      <h4>${displayName}</h4>

      <div class="product-rating">
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star-half-alt"></i>
        <span>(${reviews})</span>
      </div>

      <p class="product-desc">
        ${product.desc || "Hermoso arreglo floral"}
      </p>

      <div class="price">
        RD$ ${Number(product.price).toLocaleString("es-DO")}
      </div>

      <div class="product-actions">
        <input type="number" min="1" value="1">
        <button class="add-to-cart">Agregar🛒</button>
      </div>

      <button class="quick-view-btn">
        👁 Vista rápida
      </button>
    </div>
  `;
}

/* =============================================================
   PAGOS
   ============================================================= */
async function kf_loadPaymentConfig() {
  try {
    const res = await fetch(
      KF_CONFIG.API_URL + "/api/payment-config"
    );

    if (res.ok) {
      const cfg = await res.json();

      if (cfg.stripePublishableKey) {
        window.STRIPE_PK = cfg.stripePublishableKey;
      }

      if (cfg.paypalClientId) {
        await kf_loadPayPalSDK(cfg.paypalClientId);
      }
    }
  } catch (e) {
    console.warn("Pagos no disponibles:", e.message);
  }
}

function kf_loadPayPalSDK(clientId) {
  if (!clientId) return;

  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}
