// =======================================
// ESPERAR A QUE EL DOM CARGUE COMPLETO
// =======================================

document.addEventListener("DOMContentLoaded", () => {

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

      if (parent.classList.contains("open")) {
        submenu.style.maxHeight = submenu.scrollHeight + "px";
      } else {
        submenu.style.maxHeight = null;
      }
    });
  });

  // =====================================================
  // HERO ANIMACIÓN SUAVE
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
  // SCROLL SUAVE GLOBAL
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
  // CARRITO PREMIUM FUNCIONAL
  // =====================================================

  let cart = [];

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

  // =====================================================
// CARGAR CARRITO DESDE LOCALSTORAGE
// =====================================================

const savedCart = localStorage.getItem("cart");

if (savedCart) {
  cart = JSON.parse(savedCart);
}

// =====================================================
// GUARDAR CARRITO EN LOCALSTORAGE
// =====================================================

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}


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

  // ===============================
  // AGREGAR PRODUCTOS
  // ===============================

  document.querySelectorAll(".add-to-cart").forEach(button => {

    button.addEventListener("click", () => {

      const card = button.closest(".product-card");

      const product = {
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        image: card.querySelector("img").src,
        qty: parseInt(card.querySelector("input")?.value) || 1
      };

      const existing = cart.find(item => item.id === product.id);

      if (existing) {
        existing.qty += product.qty;
      } else {
        cart.push(product);
      }

      renderCart();
      openCart();
    });

  });

  // ===============================
  // RENDER CARRITO
  // ===============================

  function renderCart() {

    cartItems.innerHTML = "";
    let total = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {

      const subtotal = item.price * item.qty;
      total += subtotal;
      totalItems += item.qty;

      const percentage = Math.min((item.qty / 10) * 100, 100);

      cartItems.innerHTML += `
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

    cartTotal.textContent = "RD$ " + total.toFixed(2);

    floatingCount.forEach(counter => {
      counter.textContent = totalItems;
    });

    addQuantityEvents();

    saveCart();
  }

  function addQuantityEvents() {

    document.querySelectorAll(".btn-plus").forEach(btn => {
      btn.addEventListener("click", () => {
        cart[btn.dataset.index].qty++;
        renderCart();
      });
    });

    document.querySelectorAll(".btn-minus").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = btn.dataset.index;

        if (cart[index].qty > 1) {
          cart[index].qty--;
        } else {
          cart.splice(index, 1);
        }

        renderCart();
      });
    });

    document.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        cart.splice(btn.dataset.index, 1);
        renderCart();
      });
    });
  }

  // ===============================
  // CHECKOUT
  // ===============================

  showCheckoutBtn?.addEventListener("click", () => {

    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    checkoutInside?.classList.toggle("active");
  });

  checkoutForm?.addEventListener("submit", (e) => {

    e.preventDefault();

    alert("🎉 Pedido confirmado correctamente");

    cart = [];
    renderCart();
    checkoutInside.classList.remove("active");
    closeCart();
  });

   
// =====================================================
// MODAL IMAGEN PRODUCTO (CLICK PARA AGRANDAR)
// =====================================================

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImage = document.querySelector(".close-image");

// Delegación de evento (mejor versión profesional)
document.addEventListener("click", function (e) {

  const img = e.target.closest(".product-card img");

  if (img) {
    imageModal.classList.add("active");
    modalImage.src = img.src;
    document.body.style.overflow = "hidden";
  }

});

// Cerrar con botón X
closeImage?.addEventListener("click", closeModal);

// Cerrar haciendo click fuera de la imagen
imageModal?.addEventListener("click", function (e) {
  if (e.target === imageModal) {
    closeModal();
  }
});

// Cerrar con tecla ESC (extra profesional)
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeModal();
  }
});

function closeModal() {
  imageModal.classList.remove("active");
  document.body.style.overflow = "auto";
}

renderCart();

});
