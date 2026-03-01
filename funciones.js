// =======================================
// ESPERAR A QUE EL DOM CARGUE COMPLETO
// =======================================

document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // MENÚ HAMBURGUESA
  // ===============================

  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("menuOverlay");

  if (menuToggle && mobileMenu && overlay) {

    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      mobileMenu.classList.toggle("active");
      overlay.classList.toggle("active");
      document.body.classList.toggle("menu-open");
    });

    overlay.addEventListener("click", closeMenu);

    function closeMenu() {
      menuToggle.classList.remove("active");
      mobileMenu.classList.remove("active");
      overlay.classList.remove("active");
      document.body.classList.remove("menu-open");
    }

    // Cerrar menú al hacer click en un link
    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", closeMenu);
    });
  }


  // ===============================
  // DROPDOWN CATÁLOGO MÓVIL
  // ===============================

  const dropdownHeaders = document.querySelectorAll(".mobile-dropdown-header");

  dropdownHeaders.forEach(header => {
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


  // ===============================
  // HERO ANIMACIÓN SUAVE
  // ===============================

  const heroContent = document.querySelector(".hero-content");

  if (heroContent) {
    setTimeout(() => {
      heroContent.style.transition = "all 1s cubic-bezier(.77,0,.18,1)";
      heroContent.style.opacity = "1";
      heroContent.style.transform = "translateY(0)";
    }, 300);
  }


  // ===============================
  // SCROLL SUAVE GLOBAL
  // ===============================

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

});

