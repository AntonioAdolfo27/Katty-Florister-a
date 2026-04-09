/* =============================================================
   KATTY FLORISTERÍA — funciones.js  v5.0  (LIMPIO)
   Sin duplicados. Funciona en index.html y catalogo.html.
   API detectada automáticamente via config.js
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {
  /* ─── API URL desde config.js ─────────────────────────────── */
  const API = (typeof KF_CONFIG !== 'undefined') ? KF_CONFIG.API_URL : '';
  const WA  = (typeof KF_CONFIG !== 'undefined') ? KF_CONFIG.WA_NUMBER : '18294317622';

  /* ═══ STORE — carrito + favoritos ════════════════════════════ */
  const store = {
    cart: [],
    favorites: [],
    save() {
      try {
        localStorage.setItem('kf_cart',      JSON.stringify(this.cart));
        localStorage.setItem('kf_favorites', JSON.stringify(this.favorites));
      } catch(e) {}
    },
    load() {
      try {
        const c = localStorage.getItem('kf_cart');
        const f = localStorage.getItem('kf_favorites');
        if (c) this.cart      = JSON.parse(c);
        if (f) this.favorites = JSON.parse(f);
      } catch(e) { this.cart = []; this.favorites = []; }
    },
    clearCart() { this.cart = []; this.save(); }
  };
  store.load();

  /* Exponer globalmente para que HTML inline pueda llamarlos */
  window.bindProductEvents  = bindProductEvents;
  window.showToast          = showToast;
  window.addToCart          = addToCart;
  window.openQuickView      = openQuickView;
  window.sendChat           = sendChat;
  window.sendSuggestion     = sendSuggestion;
  window.subscribeNewsletter= subscribeNewsletter;
  window.contactPlan        = contactPlan;
  window.removeFavorite     = removeFavorite;

  /* ═══ MENÚ HAMBURGUESA ════════════════════════════════════════ */
  const menuToggle  = document.getElementById('menuToggle');
  const mobileMenu  = document.getElementById('mobileMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  function closeMenu() {
    menuToggle?.classList.remove('active');
    mobileMenu?.classList.remove('active');
    menuOverlay?.classList.remove('active');
    document.body.classList.remove('menu-open');
  }

  menuToggle?.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileMenu?.classList.toggle('active');
    menuOverlay?.classList.toggle('active');
    document.body.classList.toggle('menu-open');
  });
  menuOverlay?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMenu));

  /* Dropdown móvil catálogo */
  document.querySelectorAll('.mobile-dropdown-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const p   = hdr.parentElement;
      const sub = p.querySelector('.mobile-submenu');
      p.classList.toggle('open');
      if (sub) sub.style.maxHeight = p.classList.contains('open') ? sub.scrollHeight + 'px' : null;
    });
  });

  /* Catalog menu active state */
  document.querySelectorAll('.catalog-menu .menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.catalog-menu .menu-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ═══ HERO ANIMACIÓN ══════════════════════════════════════════ */
  const hc = document.querySelector('.hero-content');
  if (hc) setTimeout(() => hc.classList.add('visible'), 150);

  /* ═══ CART COUNTERS ═══════════════════════════════════════════ */
  function updateCartCounters() {
    const n = store.cart.reduce((a, i) => a + i.qty, 0);
    document.querySelectorAll('.cart-count, #floatingCount, #floatingCountMobile, .floating-count')
      .forEach(el => { if (el) el.textContent = n; });
  }

  /* ═══ RENDER CARRITO ══════════════════════════════════════════ */
  function renderCartItems() {
    const container = document.getElementById('cartItems');
    const totalEl   = document.getElementById('cartTotal');
    if (!container) return;

    if (!store.cart.length) {
      container.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-bag"></i>
          <p>Tu carrito está vacío</p>
          <p style="font-size:.75rem;margin-top:6px;color:#555;">Explora el catálogo 🌸</p>
        </div>`;
      if (totalEl) totalEl.textContent = '0';
      return;
    }

    let total = 0;
    container.innerHTML = store.cart.map(item => {
      const sub = item.price * item.qty;
      total += sub;
      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>RD$ ${item.price.toLocaleString('es-DO')} × ${item.qty}</p>
            <p class="subtotal">= RD$ ${sub.toLocaleString('es-DO')}</p>
            <div class="cart-qty-controls">
              <button class="qty-btn" data-id="${item.id}" data-action="down">−</button>
              <span class="qty-display">${item.qty}</span>
              <button class="qty-btn" data-id="${item.id}" data-action="up">+</button>
            </div>
          </div>
          <button class="remove-item" data-id="${item.id}">✕</button>
        </div>`;
    }).join('');

    if (totalEl) totalEl.textContent = total.toLocaleString('es-DO');

    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = store.cart.find(i => i.id === btn.dataset.id);
        if (!item) return;
        if (btn.dataset.action === 'up') item.qty++;
        else {
          item.qty--;
          if (item.qty <= 0) store.cart = store.cart.filter(i => i.id !== btn.dataset.id);
        }
        store.save(); updateCartCounters(); renderCartItems();
      });
    });

    container.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        store.cart = store.cart.filter(i => i.id !== btn.dataset.id);
        store.save(); updateCartCounters(); renderCartItems();
      });
    });
  }

  /* ═══ ADD TO CART ═════════════════════════════════════════════ */
  function addToCart(id, name, price, qty = 1) {
    const ex = store.cart.find(i => i.id === id);
    if (ex) ex.qty += qty;
    else store.cart.push({ id, name, price: parseFloat(price), qty });
    store.save();
    updateCartCounters();
    renderCartItems();
    trackEvent('add_to_cart', { product: name });
  }

  /* ═══ OPEN / CLOSE CARRITO ════════════════════════════════════ */
  function openCart() {
    document.getElementById('cartSidebar')?.classList.add('active');
    document.getElementById('cartOverlay')?.classList.add('active');
  }
  function closeCart() {
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.getElementById('checkoutInside')?.classList.remove('active');
  }

  document.getElementById('openCart')?.addEventListener('click', openCart);
  document.getElementById('openCartMobile')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('showCheckout')?.addEventListener('click', () => {
    if (!store.cart.length) { showToast('⚠️ El carrito está vacío'); return; }
    document.getElementById('checkoutInside')?.classList.add('active');
    trackEvent('checkout_start');
  });

  /* ═══ CHECKOUT — UN SOLO LISTENER ════════════════════════════ */
  document.getElementById('checkoutForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const name    = document.getElementById('customerName')?.value?.trim();
    const phone   = document.getElementById('customerPhone')?.value?.trim();
    const email   = document.getElementById('customerEmail')?.value?.trim() || '';
    const address = document.getElementById('customerAddress')?.value?.trim();
    const note    = document.getElementById('customerNote')?.value?.trim()   || '';

    if (!name || !phone || !address) {
      showToast('⚠️ Completa nombre, teléfono y dirección');
      return;
    }

    const total = store.cart.reduce((a, i) => a + i.price * i.qty, 0);

    /* Payload completo que el servidor espera */
    const orderPayload = {
      customer_name:    name,
      customer_phone:   phone,
      customer_email:   email,
      customer_address: address,
      customer_note:    note,
      items_json:       store.cart,
      total,
      payment_method:  'whatsapp',
      payment_status:  'pending',
      status:          'confirmed',
      date:            new Date().toLocaleString('es-DO'),
      created_at:      new Date().toISOString()
    };

    /* 1. Intentar guardar en Railway → Supabase */
    let savedOrder = null;
    if (API) {
      try {
        const res = await fetch(`${API}/api/orders`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(orderPayload),
          signal:  AbortSignal.timeout(7000)
        });
        if (res.ok) {
          const data = await res.json();
          savedOrder = data.order || null;
          console.log('[KF] Pedido guardado en Supabase:', savedOrder?.tracking_code);
        } else {
          console.warn('[KF] Error al guardar pedido en servidor:', res.status);
        }
      } catch(err) {
        console.warn('[KF] Backend no disponible, guardando localmente:', err.message);
      }
    }

    /* 2. Guardar en localStorage como respaldo (con datos del servidor si los hay) */
    try {
      const local = JSON.parse(localStorage.getItem('kf_orders') || '[]');
      const toSave = savedOrder || { ...orderPayload, id: Date.now() };
      local.unshift(toSave); /* unshift = más reciente primero */
      localStorage.setItem('kf_orders', JSON.stringify(local));
    } catch(e) {}

    /* 3. Construir mensaje de WhatsApp */
    const trackCode = savedOrder?.tracking_code || '';
    let msg = `🌸 *Nuevo Pedido — Katty Floristería*\n\n`;
    if (trackCode) msg += `📦 *Código de seguimiento:* ${trackCode}\n`;
    msg += `👤 *Cliente:* ${name}\n📞 *Teléfono:* ${phone}\n`;
    if (email)   msg += `✉️ *Email:* ${email}\n`;
    msg += `📍 *Dirección:* ${address}\n`;
    if (note)    msg += `📝 *Nota:* ${note}\n`;
    msg += `\n*🛒 Productos:*\n`;
    store.cart.forEach(i => {
      msg += `• ${i.name} × ${i.qty} = RD$ ${(i.price * i.qty).toLocaleString('es-DO')}\n`;
    });
    msg += `\n💰 *Total: RD$ ${total.toLocaleString('es-DO')}*\n\n¡Gracias por su pedido! 🌸`;

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');

    store.clearCart();
    updateCartCounters();
    renderCartItems();
    closeCart();
    showToast('✅ ¡Pedido enviado! Te contactaremos pronto.', 'success');
    trackEvent('order_placed', { total });
  });

  /* ═══ FAVORITOS ═══════════════════════════════════════════════ */
  function updateFavoritesUI() {
    document.querySelectorAll('#favoritesCount').forEach(el => el.textContent = store.favorites.length);
    renderFavorites();
  }

  function renderFavorites() {
    const c = document.getElementById('favoritesItems');
    if (!c) return;
    if (!store.favorites.length) {
      c.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:#888;">
          <i class="fas fa-heart" style="font-size:38px;opacity:.2;display:block;margin-bottom:10px;"></i>
          <p style="font-size:.83rem;">No tienes favoritos aún</p>
        </div>`;
      return;
    }
    c.innerHTML = store.favorites.map(item => `
      <div style="display:flex;align-items:center;gap:11px;padding:13px;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="flex:1;">
          <h4 style="font-size:.83rem;margin-bottom:3px;color:#fff;">${item.name}</h4>
          <p style="font-size:.78rem;color:var(--primary-light);">RD$ ${Number(item.price).toLocaleString('es-DO')}</p>
        </div>
        <button onclick="addToCart('${item.id}','${item.name.replace(/'/g,"\\'")}',${item.price})"
                style="background:var(--primary);border:none;color:#fff;padding:6px 10px;border-radius:7px;cursor:pointer;font-size:.7rem;">🛒</button>
        <button onclick="removeFavorite('${item.id}')"
                style="background:rgba(244,67,54,.1);border:1px solid rgba(244,67,54,.3);color:#f44336;padding:6px 9px;border-radius:7px;cursor:pointer;font-size:.7rem;">✕</button>
      </div>`).join('');
  }

  function removeFavorite(id) {
    store.favorites = store.favorites.filter(f => f.id !== id);
    store.save();
    updateFavoritesUI();
    showToast('💔 Quitado de favoritos');
  }

  document.getElementById('openFavorites')?.addEventListener('click', () => {
    document.getElementById('favoritesSidebar')?.classList.add('active');
    document.getElementById('favoritesOverlay')?.classList.add('active');
    updateFavoritesUI();
  });
  const closeFavs = () => {
    document.getElementById('favoritesSidebar')?.classList.remove('active');
    document.getElementById('favoritesOverlay')?.classList.remove('active');
  };
  document.getElementById('closeFavorites')?.addEventListener('click', closeFavs);
  document.getElementById('favoritesOverlay')?.addEventListener('click', closeFavs);
  document.getElementById('addAllToCart')?.addEventListener('click', () => {
    if (!store.favorites.length) { showToast('No tienes favoritos'); return; }
    store.favorites.forEach(f => addToCart(f.id, f.name, f.price));
    showToast('🛒 Todos los favoritos agregados', 'success');
  });

  /* ═══ BIND PRODUCT EVENTS ═════════════════════════════════════ */
  function bindProductEvents() {
    /* Botón agregar al carrito */
    document.querySelectorAll('.add-to-cart:not([data-bound])').forEach(btn => {
      btn.dataset.bound = '1';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.product-card');
        if (!card) return;
        const qty = parseInt(card.querySelector('input[type=number]')?.value) || 1;
        addToCart(card.dataset.id, card.dataset.name, parseFloat(card.dataset.price), qty);
        const orig = btn.textContent;
        btn.textContent = '✅ Agregado!';
        btn.style.background = '#22c55e';
        setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1600);
        openCart();
      });
    });

    /* Botón favorito */
    document.querySelectorAll('.favorite-btn:not([data-bound])').forEach(btn => {
      btn.dataset.bound = '1';
      const card = btn.closest('.product-card');
      if (!card) return;
      const id   = card.dataset.id;
      const icon = btn.querySelector('i');
      const isFav = store.favorites.some(f => f.id === id);
      icon?.classList.toggle('fa-solid',  isFav);
      icon?.classList.toggle('fa-regular', !isFav);

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = store.favorites.findIndex(f => f.id === id);
        if (idx > -1) {
          store.favorites.splice(idx, 1);
          icon?.classList.replace('fa-solid', 'fa-regular');
          showToast('💔 Quitado de favoritos');
        } else {
          store.favorites.push({ id, name: card.dataset.name, price: parseFloat(card.dataset.price) });
          icon?.classList.replace('fa-regular', 'fa-solid');
          showToast('❤️ Agregado a favoritos', 'success');
        }
        store.save();
        updateFavoritesUI();
      });
    });

    /* Vista rápida */
    document.querySelectorAll('.quick-view-btn:not([data-bound])').forEach(btn => {
      btn.dataset.bound = '1';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.product-card');
        if (!card) return;
        openQuickView(
          card.dataset.id,
          card.dataset.name,
          card.querySelector('.product-image img')?.src || '',
          card.querySelector('.product-desc')?.textContent || '',
          parseFloat(card.dataset.price)
        );
      });
    });

    /* Zoom de imagen */
    document.querySelectorAll('.product-image img:not([data-bound])').forEach(img => {
      img.dataset.bound = '1';
      img.addEventListener('click', () => {
        const modal = document.getElementById('imageModal');
        const mImg  = document.getElementById('modalImage');
        if (modal && mImg) { mImg.src = img.src; modal.classList.add('active'); }
      });
    });
  }

  /* Observer para rebindear cuando se añaden tarjetas dinámicamente */
  new MutationObserver(() => setTimeout(bindProductEvents, 80))
    .observe(document.body, { childList: true, subtree: true });
  setTimeout(bindProductEvents, 200);

  /* ═══ IMAGE MODAL ═════════════════════════════════════════════ */
  const imgModal = document.getElementById('imageModal');
  document.querySelector('.close-image')?.addEventListener('click', () => imgModal?.classList.remove('active'));
  imgModal?.addEventListener('click', e => { if (e.target === imgModal) imgModal.classList.remove('active'); });

  /* ═══ QUICK VIEW ══════════════════════════════════════════════ */
  function openQuickView(id, name, img, desc, price) {
    // Registrar vista del producto en Supabase
    fetch(API + '/api/analytics/product-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: id, product_name: name })
    }).catch(() => {});
    const $ = id => document.getElementById(id);
    if ($('qvTitle'))  $('qvTitle').textContent  = name;
    if ($('qvDesc'))   $('qvDesc').textContent   = desc;
    if ($('qvPrice'))  $('qvPrice').textContent  = 'RD$ ' + Number(price).toLocaleString('es-DO');
    if ($('qvImage')) {
      $('qvImage').src = img;
      $('qvImage').onerror = () => { $('qvImage').src = 'https://placehold.co/400x350/1a1a22/ff4081?text=🌸'; };
    }
    const ab = $('qvAddBtn');
    if (ab) { ab.dataset.id = id; ab.dataset.name = name; ab.dataset.price = price; }
    $('quickViewModal')?.classList.add('open');
  }

  document.getElementById('closeQuickView')?.addEventListener('click', () =>
    document.getElementById('quickViewModal')?.classList.remove('open'));
  document.getElementById('quickViewModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  document.getElementById('qvAddBtn')?.addEventListener('click', function() {
    if (!this.dataset.id) return;
    addToCart(this.dataset.id, this.dataset.name, parseFloat(this.dataset.price));
    showToast('🛒 Producto agregado', 'success');
    document.getElementById('quickViewModal')?.classList.remove('open');
    openCart();
  });

  /* ═══ SMART BAR ═══════════════════════════════════════════════ */
  (function updateSmartBar() {
    const dot    = document.getElementById('smartDot');
    const status = document.getElementById('smartStatus');
    const info   = document.getElementById('smartInfo');
    const sched  = document.getElementById('smartSchedule');
    if (!dot || !status) return;
    const h = new Date().getHours();
    const d = new Date().getDay();
    const isOpen = d === 0 ? (h >= 9 && h < 15) : (h >= 8 && h < 20);
    dot.style.background   = isOpen ? '#4caf50' : '#f44336';
    status.textContent     = isOpen ? '🟢 Abiertos ahora' : '🔴 Cerrado';
    if (info)  info.textContent  = isOpen ? '¡Estamos disponibles para atenderte!' : 'Pronto estaremos disponibles';
    if (sched) sched.textContent = d === 0 ? 'Domingos: 9:00 AM – 3:00 PM' : 'Lunes–Sábado: 8:00 AM – 8:00 PM';
  })();

  /* ═══ TOAST ═══════════════════════════════════════════════════ */
  function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.cssText = 'opacity:0;transform:translateX(60px);transition:.3s';
    }, 2800);
    setTimeout(() => t.remove(), 3200);
  }

  /* ═══ CONTADORES ANIMADOS ═════════════════════════════════════ */
  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const target = +e.target.dataset.target;
      const step   = target / 55;
      let cur = 0;
      const t = setInterval(() => {
        cur += step;
        if (cur >= target) { e.target.textContent = target.toLocaleString(); clearInterval(t); }
        else e.target.textContent = Math.floor(cur).toLocaleString();
      }, 22);
      cObs.unobserve(e.target);
    });
  }, { threshold: .5 });
  document.querySelectorAll('.counter').forEach(c => cObs.observe(c));

  /* ═══ SCROLL TOP ══════════════════════════════════════════════ */
  const scrollBtn = document.getElementById('scrollTopBtn');
  if (scrollBtn) {
    window.addEventListener('scroll', () =>
      scrollBtn.classList.toggle('visible', window.scrollY > 400));
    scrollBtn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ═══ CHATBOT ═════════════════════════════════════════════════ */
  const botBubble = document.getElementById('chatbotBubble');
  const botWindow = document.getElementById('chatbotWindow');

  botBubble?.addEventListener('click', () => {
    botWindow?.classList.toggle('open');
    const badge = botBubble.querySelector('.chatbot-badge');
    if (badge) badge.style.display = 'none';
    if (botWindow?.classList.contains('open') && !document.getElementById('chatMessages')?.children.length) {
      setTimeout(() => addBotMsg('¡Hola! 🌸 Soy <strong>Florbot</strong>, tu asistente de Katty Floristería. ¿En qué puedo ayudarte?'), 350);
    }
    trackEvent('chatbot_open');
  });
  document.getElementById('closeChatbot')?.addEventListener('click', () => botWindow?.classList.remove('open'));

  function addBotMsg(html) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot';
    typing.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => {
      typing.remove();
      const m = document.createElement('div');
      m.className = 'chat-msg bot';
      m.innerHTML = `<div class="chat-msg-bubble">${html}</div>
                     <div class="chat-msg-time">${new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}</div>`;
      msgs.appendChild(m);
      msgs.scrollTop = msgs.scrollHeight;
    }, 900);
  }

  function addUserMsg(text) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const m = document.createElement('div');
    m.className = 'chat-msg user';
    m.innerHTML = `<div class="chat-msg-bubble">${text}</div>
                   <div class="chat-msg-time">${new Date().toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}</div>`;
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
  }

  const BOT_REPLIES = {
    producto:  '💐 Contamos con rosas, arreglos florales, orquídeas, ocasiones especiales, Luxury Box y más. ¡Explora el catálogo!',
    precio:    '💰 Precios desde <strong>RD$ 150</strong> (rosas individuales) hasta <strong>RD$ 18,000</strong> (planes corporativos). Opciones para todos los presupuestos.',
    pedido:    '🛒 Muy fácil:<br>1️⃣ Elige tu arreglo del catálogo<br>2️⃣ Agrégalo al carrito<br>3️⃣ Completa tus datos<br>4️⃣ ¡Te confirmamos por WhatsApp!',
    envio:     '🚚 Sí, realizamos envíos en toda la República Dominicana. Contáctanos para confirmar el costo según tu zona.',
    hora:      '📅 <strong>Lun–Sáb:</strong> 8:00 AM – 8:00 PM<br><strong>Domingos:</strong> 9:00 AM – 3:00 PM',
    ubicacion: '📍 Av. México 44, Santo Domingo 10211, R.D.<br>Ver mapa en la sección <a href="index.html#contactos" style="color:var(--primary-light)">Contacto</a>.',
    pago:      '💳 Aceptamos: Efectivo, transferencia bancaria y apps de pago móvil. Coordina por WhatsApp.',
    personal:  '🎨 ¡Claro que sí! Creamos arreglos completamente personalizados según tus flores, colores y presupuesto.',
    whatsapp:  `📱 Escríbenos directamente: <a href="https://wa.me/18294317622" target="_blank" style="color:var(--primary-light)">+1 829-431-7622</a>`,
    gracias:   '🌸 ¡Con mucho gusto! ¿Hay algo más en lo que pueda ayudarte?',
    hola:      '😊 ¡Hola! Bienvenido/a a Katty Floristería. ¿Buscas algo especial hoy?',
    catalogo:  '📦 Puedes ver nuestro catálogo completo <a href="catalogo.html" style="color:var(--primary-light)">aquí</a>. Tenemos más de 300 productos disponibles.',
    default:   `🌸 Para una atención personalizada, contáctanos:<br><a href="https://wa.me/18294317622" target="_blank" style="color:var(--primary-light)">📱 Abrir WhatsApp</a>`
  };

  function getBotReply(text) {
    const t = text.toLowerCase();
    for (const [k, v] of Object.entries(BOT_REPLIES)) {
      if (t.includes(k)) return v;
    }
    return BOT_REPLIES.default;
  }

  function sendChat() {
    const input = document.getElementById('chatInput');
    const text  = input?.value?.trim();
    if (!text) return;
    addUserMsg(text);
    if (input) input.value = '';
    setTimeout(() => addBotMsg(getBotReply(text)), 500);
  }

  function sendSuggestion(text) {
    addUserMsg(text);
    setTimeout(() => addBotMsg(getBotReply(text)), 500);
  }

  /* ═══ NEWSLETTER ══════════════════════════════════════════════ */
  function subscribeNewsletter() {
    const el = document.getElementById('newsletterEmail');
    const v  = el?.value?.trim();
    if (!v || !v.includes('@') || !v.includes('.')) {
      showToast('⚠️ Ingresa un email válido');
      return;
    }
    // Guardar en Supabase via API
    fetch(API + '/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: v, source: 'web' })
    }).catch(() => {});
    // Respaldo local
    try {
      const subs = JSON.parse(localStorage.getItem('kf_subscribers') || '[]');
      if (!subs.find(s => (s.email || s) === v)) {
        subs.push({ email: v, date: new Date().toISOString() });
        localStorage.setItem('kf_subscribers', JSON.stringify(subs));
      }
    } catch(e) {}
    if (el) el.value = '';
    showToast('✅ ¡Suscripción exitosa! Gracias.', 'success');
    trackEvent('newsletter_subscribe', { email: v });
  }

  /* ═══ PLANES ══════════════════════════════════════════════════ */
  function contactPlan(plan) {
    window.open(
      `https://wa.me/${WA}?text=${encodeURIComponent('Hola Katty, me interesa el Plan ' + plan + '. ¿Pueden darme información?')}`,
      '_blank'
    );
    trackEvent('plan_inquiry', { plan });
  }

  /* ═══ ANALYTICS LOCAL ═════════════════════════════════════════ */
  function trackEvent(event, data = {}) {
    // Guardar en Supabase (fire & forget, no bloquea la UI)
    fetch(API + '/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data })
    }).catch(() => {});
    // Respaldo local
    try {
      const s = JSON.parse(localStorage.getItem('kf_analytics') || '{"visits":0,"clicks":{},"products":{},"events":[],"daily":{}}');
      if (!s.events) s.events = [];
      s.events.push({ event, data, time: new Date().toISOString() });
      if (!s.clicks) s.clicks = {};
      s.clicks[event] = (s.clicks[event] || 0) + 1;
      localStorage.setItem('kf_analytics', JSON.stringify(s));
    } catch(e) {}
  }

  /* Registrar visita de página — guarda en Supabase y localStorage */
  (function() {
    fetch(API + '/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: window.location.pathname })
    }).catch(() => {});
    try {
      const s = JSON.parse(localStorage.getItem('kf_analytics') || '{"visits":0,"daily":{}}');
      s.visits = (s.visits || 0) + 1;
      const today = new Date().toLocaleDateString('es-DO');
      if (!s.daily) s.daily = {};
      s.daily[today] = (s.daily[today] || 0) + 1;
      localStorage.setItem('kf_analytics', JSON.stringify(s));
    } catch(e) {}
  })();

  /* ═══ TECLA ESCAPE ════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.getElementById('imageModal')?.classList.remove('active');
    document.getElementById('quickViewModal')?.classList.remove('open');
    document.getElementById('chatbotWindow')?.classList.remove('open');
    closeCart();
    closeFavs();
  });

  /* ═══ INICIALIZACIÓN ══════════════════════════════════════════ */
  updateCartCounters();
  updateFavoritesUI();
  renderCartItems();

}); /* fin DOMContentLoaded */
