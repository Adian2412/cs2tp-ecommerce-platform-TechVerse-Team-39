// tv-nav.js - renders the shared TechVerse navigation on every page
// Usage: add <div id="tv-nav-root"></div> then <script src="javascript/tv-nav.js"></script>
// OR call window.tvNav.render(activeLink) manually

(function () {
  function getApiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      return ((meta && meta.content) || '').replace(/\/+$/, '');
    } catch { return ''; }
  }

  function renderTopbar() {
    return `<div class="tv-topbar">
      <div class="tv-topbar__inner">
        <div class="tv-topbar__flag" id="flag"><i class="fa-solid fa-globe"></i></div>
        <div class="tv-topbar__links">
          <a href="support.html"><i class="fa-solid fa-headset"></i> 24/7 Support</a>
          <a href="delivery.html"><i class="fa-solid fa-truck"></i> Free delivery over £50</a>
          <a href="returns-info.html"><i class="fa-solid fa-rotate-left"></i> 30-day returns</a>
        </div>
      </div>
    </div>`;
  }

  function renderNav() {
    return `<nav class="tv-nav">
      <div class="tv-nav__inner">
        <a href="index.html" class="tv-logo"><span class="tv-logo__text">Tech<span>Verse</span></span></a>
        <form class="tv-search" id="tv-search-form">
          <input class="tv-search__input" id="tv-search-input" type="text" placeholder="Search for products, brands and more...">
          <button class="tv-search__btn" type="submit"><i class="fa-solid fa-magnifying-glass"></i></button>
        </form>
        <div class="tv-nav__actions">
          <a href="account.html" class="tv-nav__action"><i class="fa-regular fa-user"></i><span>Account</span></a>
          <a href="liked.html" class="tv-nav__action"><i class="fa-regular fa-heart"></i><span>Saved</span></a>
          <a href="cart.html" class="tv-nav__action">
            <div class="tv-cart-badge"><i class="fa-solid fa-basket-shopping"></i><span id="cart-count" class="tv-cart-count" style="display:none"></span></div>
            <strong>Cart</strong>
          </a>
          <button id="signin" class="tv-btn tv-btn--primary tv-btn--sm" onclick="location.href='signin.html'">Sign In</button>
        </div>
      </div>
    </nav>`;
  }

  function renderCatnav(active) {
    const links = [
      { href: 'customer.html', label: 'All Products' },
      { href: 'customer.html?cat=computers', label: 'Computers' },
      { href: 'customer.html?cat=gaming', label: 'Gaming' },
      { href: 'customer.html?cat=audio', label: 'Audio' },
      { href: 'customer.html?cat=accessories', label: 'Accessories' },
      { href: 'customer.html?cat=displays', label: 'Monitors' },
      { href: 'customer.html', label: 'Browse All' },
      { href: 'customer.html?cat=computers', label: 'Computers' },
      { href: 'aboutus.html', label: 'About' },
      { href: 'contact.html', label: 'Contact' },
    ];
    return `<div class="tv-catnav">
      <div class="tv-catnav__inner">
        ${links.map(l => `<a href="${l.href}" class="tv-catnav__link${active === l.label ? ' active' : ''}">${l.label}</a>`).join('')}
        <a href="admin.html" class="tv-catnav__link" id="nav-admin" style="display:none;color:var(--tv-yellow)">Admin ★</a>
      </div>
    </div>`;
  }

  function renderFooter() {
    return `<footer class="tv-footer">
      <div class="tv-footer__top">
        <div class="tv-footer__col">
          <div class="tv-footer__col-title">TechVerse</div>
          <ul><li><a href="aboutus.html">About Us</a></li><li><a href="contact.html">Contact</a></li><li><a href="privacy.html">Privacy Policy</a></li></ul>
        </div>
        <div class="tv-footer__col">
          <div class="tv-footer__col-title">Customer Service</div>
          <ul><li><a href="support.html">Help &amp; Support</a></li><li><a href="returns-info.html">Returns</a></li><li><a href="delivery.html">Delivery Info</a></li></ul>
        </div>
        <div class="tv-footer__col">
          <div class="tv-footer__col-title">My Account</div>
          <ul><li><a href="account.html">My Account</a></li><li><a href="cart.html">My Cart</a></li><li><a href="liked.html">Saved Items</a></li></ul>
        </div>
        <div class="tv-footer__col">
          <div class="tv-footer__col-title">Shop</div>
          <ul><li><a href="customer.html">Browse All</a></li><li><a href="customer.html?cat=gaming">Gaming</a></li><li><a href="customer.html?cat=computers">Computers</a></li></ul>
        </div>
      </div>
      <div class="tv-footer__bottom">&copy; 2026 Tech Verse Ltd &middot; Aston University, Birmingham, UK</div>
    </footer>`;
  }

  window.tvNav = { renderTopbar, renderNav, renderCatnav, renderFooter, getApiBase };

  // Wire up search form after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tv-search-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = document.getElementById('tv-search-input')?.value?.trim() || '';
        if (q) location.href = 'customer.html?search=' + encodeURIComponent(q);
      });
    }
    // Load geo flag
    const flagEl = document.getElementById('flag');
    if (flagEl && window.tvCurrency) {
      // geo-flag.js handles this
    }
  });
})();
