document.addEventListener('DOMContentLoaded', () => {
  const listingsEl = document.getElementById('listings');
  if (!listingsEl) return;

  const searchInput = document.getElementById('search-input');
  const categoriesEl = document.getElementById('categories');
  const minPriceEl = document.getElementById('min-price');
  const maxPriceEl = document.getElementById('max-price');
  const minRatingEl = document.getElementById('min-rating');
  const sortByEl = document.getElementById('sort-by');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const resultsCountEl = document.getElementById('results-count');

  const API_BASE = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '/api';
  const PRODUCT_CACHE_KEY = 'techverse_listings_v1';

  let allProducts = [];
  let currentFilter = { category: 'all', search: '', minPrice: '', maxPrice: '', minRating: '0', sortBy: 'latest' };

  function formatPrice(v) {
    if (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') return window.tvCurrency.formatCurrency(v);
    const num = parseFloat(v);
    if (!Number.isFinite(num)) return 'Price not available';
    return '£' + num.toFixed(2);
  }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function availabilityBadge(product) {
    if (product.is_sold) return '<span class="tv-badge tv-badge-sold">Sold</span>';
    if (!product.is_active) return '<span class="tv-badge tv-badge-unavailable">Unavailable</span>';
    if ((product.stock || 0) <= 0) return '<span class="tv-badge tv-badge-out">Out of stock</span>';
    if (product.is_low_stock) return `<span class="tv-badge tv-badge-low">Low stock (${product.stock} left)</span>`;
    return '<span class="tv-badge tv-badge-in">In stock</span>';
  }

  function ratingSummary(product) {
    const rating = Number(product.avg_rating || 0);
    const count = Number(product.reviews_count || 0);
    if (!count || rating <= 0) return '<div class="rating-line">No ratings yet</div>';
    const full = Math.round(rating);
    return `<div class="rating-line">${'★'.repeat(full)}${'☆'.repeat(5 - full)} · ${rating.toFixed(1)}/5 (${count})</div>`;
  }

  function injectBadgeStyles() {
    if (document.getElementById('tv-stock-badge-styles')) return;
    const style = document.createElement('style');
    style.id = 'tv-stock-badge-styles';
    style.textContent = `
      .tv-badge-wrap { margin: 10px 0 6px; }
      .tv-badge { display:inline-block; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; }
      .tv-badge-in { background:#eaf8ee; color:#1d6b37; }
      .tv-badge-low { background:#fff4df; color:#8a5700; }
      .tv-badge-out { background:#ffe8e8; color:#a11b1b; }
      .tv-badge-sold, .tv-badge-unavailable { background:#eef1f4; color:#51606f; }
      .product-meta { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
      .product-meta-note { font-size:12px; color:#6a7785; }
    `;
    document.head.appendChild(style);
  }

  function normaliseProducts(rawList) {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(p => {
      const image =
        (p.images && Array.isArray(p.images) && p.images[0] && p.images[0].image_path) ||
        p.image_url ||
        'https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse';
      const categoryName =
        (p.category && typeof p.category === 'object' ? (p.category.name || p.category.slug || '') : (p.category || '')) ||
        p.category_name ||
        (p.categories && p.categories[0]?.name) || '';
      const categorySlug = (p.category && typeof p.category === 'object' ? (p.category.slug || p.category.name || '') : categoryName).toString().toLowerCase();
      const stock = Number(p.stock || 0);
      const threshold = Number(p.low_stock_threshold || 0);
      const isActive = p.is_active !== false && p.is_active !== 0;
      const isSold = p.is_sold === true || p.is_sold === 1;
      const isLowStock = p.is_low_stock === true || p.is_low_stock === 1 || (stock > 0 && threshold > 0 && stock <= threshold);
      const avgRating = Number(p.avg_rating ?? p.reviews_avg_rating ?? 0) || 0;
      const reviewsCount = Number(p.reviews_count || 0) || 0;
      return {
        id: p.id,
        name: p.title || p.name || ('Product ' + p.id),
        price: typeof p.price !== 'undefined' ? Number(p.price) : (p.price_str ? Number(p.price_str) : null),
        desc: p.desc || p.description || '',
        category: categoryName,
        categorySlug,
        image,
        stock,
        low_stock_threshold: threshold,
        is_active: isActive,
        is_sold: isSold,
        is_low_stock: isLowStock,
        avg_rating: avgRating,
        reviews_count: reviewsCount,
        created_at: p.created_at || ''
      };
    });
  }

  function saveCache(list) {
    try { localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list })); } catch (e) {}
  }

  function loadCache() {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.data)) return parsed.data;
      return null;
    } catch {
      return null;
    }
  }

  function renderCategories() {
    if (!categoriesEl) return;
    const catMap = new Map();
    allProducts.forEach(p => { if (p.categorySlug) catMap.set(p.categorySlug, p.category || p.categorySlug); });
    const cats = Array.from(catMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    categoriesEl.innerHTML = [`<button class="category-chip ${currentFilter.category === 'all' ? 'active' : ''}" data-category="all" type="button">All</button>`, ...cats.map(([slug, name]) => `<button class="category-chip ${currentFilter.category === slug ? 'active' : ''}" data-category="${escapeHtml(slug)}" type="button">${escapeHtml(name)}</button>`)].join('');
    categoriesEl.querySelectorAll('[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter.category = (btn.getAttribute('data-category') || 'all').toLowerCase();
        renderCategories();
        applyFilters();
      });
    });
  }

  function renderProducts(list) {
    if (resultsCountEl) resultsCountEl.textContent = `${list.length} product${list.length === 1 ? '' : 's'} shown`;
    if (!list.length) {
      listingsEl.innerHTML = `<p style="color:#666;margin-top:12px;">No products found. Try a different search or filter.</p>`;
      return;
    }
    listingsEl.innerHTML = list.map(p => {
      const metaNote = p.is_low_stock ? 'Order soon to avoid missing out.' : ((p.stock || 0) <= 0 || p.is_sold || !p.is_active) ? 'Currently unavailable for purchase.' : 'View details';
      return `
        <article class="product-card">
          <a class="card-link" href="product_page.html?id=${encodeURIComponent(p.id)}">
            <div class="product-thumb"><img src="${p.image}" alt="${escapeHtml(p.name)}" onerror="this.src='https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse'"></div>
            <div class="product-category">${escapeHtml(p.category || '')}</div>
            <h3 class="product-title">${escapeHtml(p.name)}</h3>
            <div class="product-price">${p.price !== null ? formatPrice(p.price) : 'Price not available'}</div>
            ${ratingSummary(p)}
            <div class="tv-badge-wrap">${availabilityBadge(p)}</div>
            <p class="product-desc">${escapeHtml(p.desc || '')}</p>
            <div class="product-meta"><span>View details</span><span class="product-meta-note">${escapeHtml(metaNote)}</span></div>
          </a>
        </article>`;
    }).join('');
  }

  function applyFilters() {
    let list = allProducts.slice();
    if (currentFilter.category && currentFilter.category !== 'all') list = list.filter(p => String(p.categorySlug || p.category).toLowerCase() === currentFilter.category);
    if (currentFilter.search) {
      const q = currentFilter.search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.desc && p.desc.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
    }
    const minPrice = parseFloat(currentFilter.minPrice);
    if (Number.isFinite(minPrice)) list = list.filter(p => Number.isFinite(p.price) && p.price >= minPrice);
    const maxPrice = parseFloat(currentFilter.maxPrice);
    if (Number.isFinite(maxPrice)) list = list.filter(p => Number.isFinite(p.price) && p.price <= maxPrice);
    const minRating = Number(currentFilter.minRating || 0);
    if (minRating > 0) list = list.filter(p => Number(p.avg_rating || 0) >= minRating);
    switch (currentFilter.sortBy) {
      case 'price-asc': list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)); break;
      case 'price-desc': list.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity)); break;
      case 'rating-desc': list.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)); break;
      case 'name-asc': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || Number(b.id) - Number(a.id)); break;
    }
    renderProducts(list);
  }

  async function fetchProductsFromServer() {
    const base = API_BASE.replace(/\/+$/, '');
    const url = `${base}/products?per_page=200`;
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error('failed');
    const data = await resp.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }

  async function initData() {
    injectBadgeStyles();
    try {
      const rawList = await fetchProductsFromServer();
      allProducts = normaliseProducts(rawList);
      saveCache(allProducts);
      renderCategories();
      applyFilters();
      return;
    } catch (e) {}
    const cached = loadCache();
    if (cached && cached.length) {
      allProducts = normaliseProducts(cached);
      renderCategories();
      applyFilters();
    } else {
      if (resultsCountEl) resultsCountEl.textContent = '0 products shown';
      listingsEl.innerHTML = '<p style="color:#d00;">Unable to load products. Please try again later.</p>';
    }
  }

  if (searchInput) searchInput.addEventListener('input', () => { currentFilter.search = searchInput.value.trim(); applyFilters(); });
  if (minPriceEl) minPriceEl.addEventListener('input', () => { currentFilter.minPrice = minPriceEl.value.trim(); applyFilters(); });
  if (maxPriceEl) maxPriceEl.addEventListener('input', () => { currentFilter.maxPrice = maxPriceEl.value.trim(); applyFilters(); });
  if (minRatingEl) minRatingEl.addEventListener('change', () => { currentFilter.minRating = minRatingEl.value; applyFilters(); });
  if (sortByEl) sortByEl.addEventListener('change', () => { currentFilter.sortBy = sortByEl.value; applyFilters(); });
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => {
    currentFilter = { category: 'all', search: '', minPrice: '', maxPrice: '', minRating: '0', sortBy: 'latest' };
    if (searchInput) searchInput.value = '';
    if (minPriceEl) minPriceEl.value = '';
    if (maxPriceEl) maxPriceEl.value = '';
    if (minRatingEl) minRatingEl.value = '0';
    if (sortByEl) sortByEl.value = 'latest';
    renderCategories();
    applyFilters();
  });

  window.TechVerseListings = {
    setCategory(cat) { currentFilter.category = (cat || 'all').toLowerCase(); renderCategories(); applyFilters(); },
    getAllProducts() { return allProducts.slice(); }
  };

  initData();
});
