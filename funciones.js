document.addEventListener("DOMContentLoaded", () => {

  // =========================================
  // ESTADO GLOBAL PROFESIONAL (STORE)
  // =========================================

  const store = {
  cart: [],
  favorites: [],

  save() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    localStorage.setItem("favorites", JSON.stringify(this.favorites));
  },

  load() {
    const savedCart = localStorage.getItem("cart");
    const savedFav = localStorage.getItem("favorites");

    if (savedCart) this.cart = JSON.parse(savedCart);
    if (savedFav) this.favorites = JSON.parse(savedFav);
  },

  clear() {
    this.cart = [];
    this.save();
  }
  };

  store.load();

  // =====================================================
  // MENÚ HAMBURGUESA
  // =====================================================

  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("menuOverlay");

  function closeMenu() {
    menuToggle?.classList.remove("active");
    mobileMenu?.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.classList.remove("menu-open");
  }

  menuToggle?.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    mobileMenu.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.classList.toggle("menu-open");
  });

  overlay?.addEventListener("click", closeMenu);

  mobileMenu?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // =====================================================
  // DROPDOWN CATÁLOGO MÓVIL
  // =====================================================

  document.querySelectorAll(".mobile-dropdown-header").forEach(header => {
    header.addEventListener("click", () => {
      const parent = header.parentElement;
      const submenu = parent.querySelector(".mobile-submenu");

      if (!submenu) return;

      parent.classList.toggle("open");
      submenu.style.maxHeight = parent.classList.contains("open")
        ? submenu.scrollHeight + "px"
        : null;
    });
  });

  // =====================================================
  // HERO ANIMACIÓN
  // =====================================================

  const heroContent = document.querySelector(".hero-content");

  if (heroContent) {
    heroContent.style.opacity = "0";
    heroContent.style.transform = "translateY(40px)";

    setTimeout(() => {
      heroContent.style.transition = "all 1s cubic-bezier(.77,0,.18,1)";
      heroContent.style.opacity = "1";
      heroContent.style.transform = "translateY(0)";
    }, 300);
  }

  // =====================================================
  // SCROLL SUAVE
  // =====================================================

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    });
  });

  // =====================================================
  // CARRITO
  // =====================================================

  const cartSidebar = document.getElementById("cartSidebar");
  const cartOverlay = document.getElementById("cartOverlay");
  const openCartBtn = document.getElementById("openCart");
  const openCartMobile = document.getElementById("openCartMobile");
  const closeCartBtn = document.getElementById("closeCart");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const floatingCount = document.querySelectorAll("#floatingCount");
  const showCheckoutBtn = document.getElementById("showCheckout");
  const checkoutInside = document.getElementById("checkoutInside");
  const checkoutForm = document.getElementById("checkoutForm");

  function openCart() {
    cartSidebar?.classList.add("active");
    cartOverlay?.classList.add("active");
  }

  function closeCart() {
    cartSidebar?.classList.remove("active");
    cartOverlay?.classList.remove("active");
  }

  openCartBtn?.addEventListener("click", openCart);
  openCartMobile?.addEventListener("click", openCart);
  closeCartBtn?.addEventListener("click", closeCart);
  cartOverlay?.addEventListener("click", closeCart);

  // =====================================================
  // AGREGAR PRODUCTOS (DELEGACIÓN)
  // =====================================================

  document.addEventListener("click", (e) => {

    const addBtn = e.target.closest(".add-to-cart");
    if (!addBtn) return;

    const card = addBtn.closest(".product-card");

    const product = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: parseFloat(card.dataset.price),
      image: card.querySelector("img").src,
      qty: parseInt(card.querySelector("input")?.value) || 1
    };

    const existing = store.cart.find(p => p.id === product.id);

    if (existing) {
      existing.qty += product.qty;
    } else {
      store.cart.push(product);
    }

    addBtn.classList.add("added");
    setTimeout(() => addBtn.classList.remove("added"), 400);

    renderCart();
    store.save();
    openCart();
  });

  // =====================================================
  // RENDER CARRITO
  // =====================================================

  function renderCart() {

    let html = "";
    let total = 0;
    let totalItems = 0;

    store.cart.forEach((item, index) => {

      const subtotal = item.price * item.qty;
      total += subtotal;
      totalItems += item.qty;

      const percentage = Math.min((item.qty / 10) * 100, 100);

      html += `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}">
          
          <div class="cart-info">
            <h4>${item.name}</h4>
            <p>Precio: RD$ ${item.price.toFixed(2)}</p>
            <p>Subtotal: RD$ ${subtotal.toFixed(2)}</p>

            <div class="quantity-controls">
              <button class="btn-minus" data-index="${index}">−</button>
              <span>${item.qty}</span>
              <button class="btn-plus" data-index="${index}">+</button>
              <button class="btn-remove" data-index="${index}">✕</button>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width:${percentage}%"></div>
            </div>
          </div>
        </div>
      `;
    });

    cartItems.innerHTML = html;
    cartTotal.textContent = "RD$ " + total.toFixed(2);

    floatingCount.forEach(counter => {
      counter.textContent = totalItems;
    });
  }

  // =====================================================
  // CONTROL DE CANTIDADES (DELEGACIÓN)
  // =====================================================

  cartItems.addEventListener("click", (e) => {

    const index = e.target.dataset.index;
    if (index === undefined) return;

    if (e.target.classList.contains("btn-plus")) {
      store.cart[index].qty++;
    }

    if (e.target.classList.contains("btn-minus")) {
      if (store.cart[index].qty > 1) {
        store.cart[index].qty--;
      } else {
        store.cart.splice(index, 1);
      }
    }

    if (e.target.classList.contains("btn-remove")) {
      store.cart.splice(index, 1);
    }

    renderCart();
    store.save();
  });

    // ===============================
// CHECKOUT AVANZADO
// ===============================

showCheckoutBtn?.addEventListener("click", () => {

  if (store.cart.length === 0) {
    showToast("Tu carrito está vacío.");
    return;
  }

  checkoutInside?.classList.toggle("active");
});

checkoutForm?.addEventListener("submit", (e) => {

  e.preventDefault();

  // Generar número de orden automático
  const orderNumber = "ORD-" + Date.now();

  showToast("🎉 Pedido confirmado #" + orderNumber);

  store.clear();
  renderCart();

  checkoutInside?.classList.remove("active");
  closeCart();
});


// =====================================================
// TOAST PROFESIONAL
// =====================================================

function showToast(message) {

  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


// =====================================================
// MODAL IMAGEN PRODUCTO (PRO)
// =====================================================

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImage = document.querySelector(".close-image");

document.addEventListener("click", function (e) {

  const img = e.target.closest(".product-card img");

  if (!img) return;

  imageModal?.classList.add("active");
  modalImage.src = img.src;
  document.body.style.overflow = "hidden";
});

// Cerrar con botón X
closeImage?.addEventListener("click", closeModal);

// Cerrar haciendo click fuera
imageModal?.addEventListener("click", function (e) {
  if (e.target === imageModal) {
    closeModal();
  }
});

// Cerrar con ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeModal();
  }
});

function closeModal() {
  imageModal?.classList.remove("active");
  document.body.style.overflow = "auto";
}


// =====================================================
// CARGAR CARRITO AL INICIAR
// =====================================================
renderCart();
// =====================================================
// FAVORITOS PROFESIONAL
// =====================================================

document.addEventListener("click", (e) => {

  const favBtn = e.target.closest(".favorite-btn");
  if (!favBtn) return;

  const card = favBtn.closest(".product-card");
  const productId = card.dataset.id;

  const index = store.favorites.indexOf(productId);

  if (index > -1) {
    // Quitar favorito
    store.favorites.splice(index, 1);
    favBtn.classList.remove("active");
  } else {
    // Agregar favorito
    store.favorites.push(productId);
    favBtn.classList.add("active");

    // Animación profesional
    favBtn.style.transform = "scale(1.3)";
    setTimeout(() => {
      favBtn.style.transform = "";
    }, 200);
  }

  store.save();
  renderFavorites();
});

// =====================================================
// MARCAR FAVORITOS AL INICIAR
// =====================================================

document.querySelectorAll(".product-card").forEach(card => {

  const productId = card.dataset.id;
  const favBtn = card.querySelector(".favorite-btn");

  if (store.favorites.includes(productId)) {
    favBtn.classList.add("active");
  }
});



// =====================================================
// FAVORITOS SIDEBAR
// =====================================================

const favoritesSidebar = document.getElementById("favoritesSidebar");
const favoritesOverlay = document.getElementById("favoritesOverlay");
const openFavorites = document.getElementById("openFavorites");
const closeFavorites = document.getElementById("closeFavorites");
const favoritesItems = document.getElementById("favoritesItems");
const favoritesCount = document.getElementById("favoritesCount");
const addAllToCart = document.getElementById("addAllToCart");

function openFav() {
  favoritesSidebar.classList.add("active");
  favoritesOverlay.classList.add("active");
}


function closeFav() {
  favoritesSidebar.classList.remove("active");
  favoritesOverlay.classList.remove("active");
}

openFavorites?.addEventListener("click", openFav);
closeFavorites?.addEventListener("click", closeFav);
favoritesOverlay?.addEventListener("click", closeFav);


// RENDER FAVORITOS
function renderFavorites() {

  favoritesItems.innerHTML = "";

  store.favorites.forEach(id => {

    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (!card) return;

    const name = card.dataset.name;
    const price = card.dataset.price;
    const image = card.querySelector("img").src;

    favoritesItems.innerHTML += `
      <div class="fav-item">
        <img src="${image}" width="50">
        <div>
          <p>${name}</p>
          <small>RD$ ${price}</small>
        </div>
      </div>
    `;
  });

  favoritesCount.textContent = store.favorites.length;
}

renderFavorites();


// AGREGAR TODOS AL CARRITO
addAllToCart?.addEventListener("click", () => {

  store.favorites.forEach(id => {

    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (!card) return;

    const product = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: parseFloat(card.dataset.price),
      image: card.querySelector("img").src,
      qty: 1
    };

    const existing = store.cart.find(p => p.id === product.id);

    if (existing) {
      existing.qty++;
    } else {
      store.cart.push(product);
    }
  });

  store.save();
  renderCart();
  showToast("Todos los favoritos fueron agregados al carrito");
  closeFav();
});


// ======================================
// CONTADOR OFERTAS
// ======================================

document.querySelectorAll(".contador-oferta").forEach(timer => {

let time = parseInt(timer.dataset.time);

function updateTimer(){

const hours = Math.floor(time / 3600);
const minutes = Math.floor((time % 3600) / 60);
const seconds = time % 60;

timer.textContent =
"⏳ Oferta termina en " +
hours + "h " +
minutes + "m " +
seconds + "s";

if(time > 0){

time--;

}else{

timer.textContent = "❌ Oferta terminada";

}

}

setInterval(updateTimer,1000);

});


// ========================================
// TEMPORIZADOR DE PROMOCIONES
// ========================================

const PROMO_DURATION = 24 * 60 * 60 * 1000; 
// 24 horas

document.querySelectorAll(".promo-timer").forEach(timer => {

const id = timer.dataset.timer;

let endTime = localStorage.getItem("promo_end_" + id);

if(!endTime){

endTime = Date.now() + PROMO_DURATION;

localStorage.setItem("promo_end_" + id, endTime);

}

endTime = parseInt(endTime);

function updateTimer(){

const now = Date.now();

const diff = endTime - now;

if(diff <= 0){

timer.innerHTML = "Oferta finalizada";

return;

}

const hours = Math.floor(diff / (1000 * 60 * 60));

const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

const seconds = Math.floor((diff % (1000 * 60)) / 1000);

timer.querySelector(".time").textContent = 
`${hours.toString().padStart(2,"0")}:
${minutes.toString().padStart(2,"0")}:
${seconds.toString().padStart(2,"0")}`;

}

updateTimer();

setInterval(updateTimer,1000);

});


});
