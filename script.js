// ---- MOBILE MENU ----
(function () {
  var btn = document.getElementById('menuBtn');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  function closeMenu() {
    menu.classList.remove('mobile-menu--open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function () {
    var open = menu.classList.contains('mobile-menu--open');
    menu.classList.toggle('mobile-menu--open');
    btn.setAttribute('aria-expanded', !open);
  });

  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  window.addEventListener('scroll', function () {
    if (menu.classList.contains('mobile-menu--open')) closeMenu();
  }, { passive: true });

  document.addEventListener('click', function (e) {
    if (!menu.classList.contains('mobile-menu--open')) return;
    if (menu.contains(e.target) || btn.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('mobile-menu--open')) closeMenu();
  });
})();

// ---- HEADER SCROLL SHADOW ----
(function () {
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      header.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
    } else {
      header.style.boxShadow = 'none';
    }
  }, { passive: true });
})();

// ---- SMOOTH SCROLL ----
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
