document.addEventListener('DOMContentLoaded', function () {
  function tvApiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if (override) return override.replace(/\/+$/, '');
    } catch (e) {}
    return '';
  }

  const API_BASE = tvApiBase();
  const urlParams = new URLSearchParams(location.search);
  const productId = urlParams.get('id') || '1';
  const reviewRequest = urlParams.get('review') === '1';

  const PRODUCT_KEY = 'techverse_product_reviews_v1';
  const LIKE_KEY = 'techverse_product_likes_v1';
  const WISHLIST_KEY = 'techverse_wishlist_v1';
  const CART_KEY = 'techverse_cart_v1';

  const stars = Array.from(document.querySelectorAll('#prodstar .star'));
  const reviewArea = document.getElementById('review-area');
  const reviewText = document.getElementById('review-text');
  const submitBtn = document.getElementById('submit-review');
  const reviewsList = document.getElementById('reviews-list');
  const prodNameEl = document.getElementById('prodname');
  const prodPriceEl = document.getElementById('prodprice');
  const prodDescEl = document.querySelector('.product_description');
  const productImageWrap = document.querySelector('.product_image');
  const likeBtn = document.getElementById('like-button');
  const wishlistBtn = document.getElementById('wishlist-button');
  const addToCartBtn = document.getElementById('add-to-cart');
  const buyNowBtn = document.getElementById('buy-now');
  const cartCountEl = document.getElementById('cart-count');

  let serverAvailable = false;
  let currentRating = 0;
  let currentProduct = null;
  let reviewEligibility = { can_review: false, existing_review: null };

  function getAuthUser() {
    try {
      return JSON.parse(localStorage.getItem('techverse_auth_user') || 'null');
    } catch (e) {
      return null;
    }
  }

  function getSessionHeaders(withJson = false) {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('techverse_session_token');
    if (token) headers['X-Session-Token'] = token;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ensureReviewNotice() {
    let note = document.getElementById('review-eligibility-note');
    if (!note && reviewArea && reviewArea.parentNode) {
      note = document.createElement('div');
      note.id = 'review-eligibility-note';
      note.style.marginBottom = '10px';
      note.style.padding = '10px 12px';
      note.style.borderRadius = '8px';
      note.style.fontSize = '14px';
      reviewArea.parentNode.insertBefore(note, reviewArea);
    }
    return note;
  }

  function setReviewNotice(message, type) {
    const note = ensureReviewNotice();
    if (!note) return;

    const styles = {
      info: { bg: '#f5f7fa', border: '#d7e1ea', color: '#334155' },
      success: { bg: '#edf9ef', border: '#93d39c', color: '#1f6a2e' },
      warning: { bg: '#fff4df', border: '#f2c36b', color: '#7a4d00' },
      error: { bg: '#fff1f1', border: '#efb5b5', color: '#b42318' }
    };

    const style = styles[type] || styles.info;
    note.innerHTML = message;
    note.style.background = style.bg;
    note.style.border = `1px solid ${style.border}`;
    note.style.color = style.color;
    note.style.display = 'block';
  }

  function clearReviewNotice() {
    const note = document.getElementById('review-eligibility-note');
    if (note) note.style.display = 'none';
  }

  function highlight(upto) {
    stars.forEach(s => {
      const v = Number(s.dataset.value);
      if (v <= upto) s.classList.add('hover');
      else s.classList.remove('hover');
    });
  }

  function applySelectedStars(rating) {
    stars.forEach(x => {
      const v = Number(x.dataset.value);
      if (v <= rating) x.classList.add('selected');
      else x.classList.remove('selected');
    });
  }

  function formatCurrency(value) {
    if (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') {
      return window.tvCurrency.formatCurrency(value);
    }
    return Number.isFinite(Number(value)) ? '£' + Number(value).toFixed(2) : String(value);
  }

  function getPrimaryImage(data) {
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const primaryImg = data.images.find(img => img.is_primary) || data.images[0];
      if (primaryImg && (primaryImg.image_path || primaryImg.url)) {
        return primaryImg.image_path || primaryImg.url;
      }
    }
    if (data.image_url) return data.image_url;
    return 'images/placeholder.png';
  }

  function updateStockStatus(data) {
    if (!prodDescEl) return;

    const stock = parseInt(data.stock || 0, 10) || 0;
    const threshold = parseInt(data.low_stock_threshold || 0, 10) || 0;
    const isSold = data.is_sold === true || data.is_sold === 1;
    const isActive = data.is_active !== false && data.is_active !== 0;

    let stockLine = '';

    if (isSold) {
      stockLine = '<p style="color:#d00;font-weight:bold;margin-top:8px;">⚠️ This item has been sold</p>';
    } else if (!isActive) {
      stockLine = '<p style="color:#d00;font-weight:bold;margin-top:8px;">⚠️ This item is currently unavailable</p>';
    } else if (stock <= 0) {
      stockLine = '<p style="color:#d00;margin-top:8px;">⚠️ Out of stock</p>';
    } else if (stock <= threshold) {
      stockLine = `<p style="color:#8a5b00;font-weight:bold;margin-top:8px;">Low stock (${stock} left)</p>`;
    } else {
      stockLine = `<p style="color:#0a0;margin-top:8px;">✓ In stock (${stock} available).</p>`;
    }

    const desc = data.description ? `<p>${escapeHtml(data.description)}</p>` : '<p>No description available.</p>';
    prodDescEl.innerHTML = desc + stockLine;

    if (addToCartBtn) {
      if (isSold || !isActive || stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Unavailable';
        addToCartBtn.style.opacity = '0.6';
        addToCartBtn.style.cursor = 'not-allowed';
      } else if (stock <= threshold) {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = `Add to Cart (${stock} left)`;
        addToCartBtn.style.opacity = '1';
        addToCartBtn.style.cursor = 'pointer';
      } else {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = 'Add to Cart';
        addToCartBtn.style.opacity = '1';
        addToCartBtn.style.cursor = 'pointer';
      }
    }

    if (buyNowBtn) {
      buyNowBtn.disabled = !!(isSold || !isActive || stock <= 0);
      buyNowBtn.style.opacity = buyNowBtn.disabled ? '0.6' : '1';
      buyNowBtn.style.cursor = buyNowBtn.disabled ? 'not-allowed' : 'pointer';
    }
  }

  function renderProduct(data) {
    if (!data) return;
    currentProduct = data;

    if (prodNameEl) prodNameEl.textContent = data.name || 'Product';
    if (prodPriceEl) {
      if (typeof data.price !== 'undefined' && data.price !== null) {
        prodPriceEl.textContent = formatCurrency(data.price);
      } else {
        prodPriceEl.textContent = 'Price not available';
      }
    }

    updateStockStatus(data);

    if (productImageWrap) {
      const src = getPrimaryImage(data);
      productImageWrap.innerHTML = `<img src="${src}" alt="${escapeHtml(data.name || 'Product')}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.src='images/placeholder.png'">`;
    }

    try {
      if (data.name) document.title = data.name + ' — Tech Verse';
    } catch (e) {}
  }

  function renderReviews(items) {
    if (!reviewsList) return;
    reviewsList.innerHTML = '';

    if (!items || !items.length) {
      reviewsList.innerHTML = '<p style="color:#666;">No reviews yet — be the first to review.</p>';
      return;
    }

    items
      .slice()
      .reverse()
      .forEach(r => {
        const rating = Number(r.rating || 0);
        const text = r.comment || r.text || '';
        const author = (r.user && (r.user.name || r.user.username)) || r.author || 'Anonymous';
        const date = r.created_at
          ? new Date(r.created_at).toLocaleString()
          : r.date
          ? new Date(r.date).toLocaleString()
          : '';

        const el = document.createElement('div');
        el.className = 'review-item';
        el.innerHTML = `
          <div class="meta">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} · ${escapeHtml(author)} · ${escapeHtml(date)}</div>
          <div class="text">${escapeHtml(text)}</div>
        `;
        reviewsList.appendChild(el);
      });
  }

  function getReviewsFromPayload(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.reviews)) return payload.reviews;
    if (payload.reviews && Array.isArray(payload.reviews.data)) return payload.reviews.data;
    return [];
  }

  async function fetchProductFromServer() {
    const url = `${API_BASE}/api/products/${encodeURIComponent(productId)}`;
    const resp = await fetch(url, {
      credentials: API_BASE ? 'include' : 'same-origin',
      headers: getSessionHeaders()
    });
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('Product not found');
      throw new Error('no-server');
    }
    const json = await resp.json();
    return json.product || json.data || json;
  }

  async function fetchReviewEligibility() {
    const user = getAuthUser();
    if (!user || user.role === 'admin') {
      reviewEligibility = { can_review: false, existing_review: null };
      applyReviewEligibility();
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}/review-eligibility`, {
        credentials: API_BASE ? 'include' : 'same-origin',
        headers: getSessionHeaders()
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Unable to check review eligibility.');
      reviewEligibility = json;
    } catch (e) {
      reviewEligibility = { can_review: false, existing_review: null, error: e.message };
    }

    applyReviewEligibility();
  }

  function applyReviewEligibility() {
    const user = getAuthUser();
    clearReviewNotice();

    if (!reviewArea) return;

    reviewArea.style.display = 'none';

    if (!user) {
      setReviewNotice('Sign in to review this product.', 'info');
      return;
    }

    if (user.role === 'admin') {
      setReviewNotice('Admin accounts cannot leave product reviews.', 'warning');
      return;
    }

    if (reviewEligibility.error) {
      setReviewNotice(escapeHtml(reviewEligibility.error), 'error');
      return;
    }

    if (!reviewEligibility.can_review) {
      setReviewNotice('You can only review products you have purchased.', 'warning');
      return;
    }

    setReviewNotice(
      reviewEligibility.existing_review
        ? 'You already reviewed this product. Update your stars or comment below if you want to change it.'
        : 'Verified purchase: you can leave a review for this product.',
      'success'
    );

    reviewArea.style.display = 'flex';

    if (reviewEligibility.existing_review) {
      currentRating = Number(reviewEligibility.existing_review.rating || 0);
      applySelectedStars(currentRating);
      if (reviewText) reviewText.value = reviewEligibility.existing_review.comment || '';
    } else {
      currentRating = 0;
      applySelectedStars(0);
      if (reviewText) reviewText.value = '';
    }

    if (reviewRequest) {
      setTimeout(() => {
        reviewArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }

  async function postReviewToServer(review) {
    const url = `${API_BASE}/api/reviews`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: API_BASE ? 'include' : 'same-origin',
      headers: getSessionHeaders(true),
      body: JSON.stringify({
        product_id: parseInt(productId, 10),
        rating: review.rating,
        comment: review.text
      })
    });

    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(payload.error || payload.message || 'Failed to submit review.');
    }
    return payload;
  }

  function loadReviewsFallback() {
    const raw = localStorage.getItem(PRODUCT_KEY);
    if (!raw) return [];
    try {
      const all = JSON.parse(raw);
      return all[productId] || [];
    } catch (e) {
      return [];
    }
  }

  function saveReviewFallback(obj) {
    const raw = localStorage.getItem(PRODUCT_KEY);
    let all = {};
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch (e) {
        all = {};
      }
    }
    all[productId] = all[productId] || [];
    all[productId].push(obj);
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(all));
  }

  (async function initData() {
    try {
      const data = await fetchProductFromServer();
      serverAvailable = true;
      renderProduct(data);
      renderReviews(getReviewsFromPayload(data));
    } catch (e) {
      serverAvailable = false;

      try {
        const raw = localStorage.getItem('techverse_listings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          let list = [];
          if (Array.isArray(parsed)) list = parsed;
          else if (parsed && parsed.data && Array.isArray(parsed.data)) list = parsed.data;

          const found = list.find(x => String(x.id) === String(productId));
          if (found) {
            renderProduct({
              id: found.id,
              name: found.title || found.name || 'Product ' + found.id,
              price: typeof found.price !== 'undefined' ? found.price : found.price_str || null,
              description: found.desc || found.description || '',
              images: found.images || [],
              image_url: found.image_url || null,
              stock: found.stock || 0
            });
          } else {
            if (prodNameEl) prodNameEl.textContent = 'Product not found';
            if (prodDescEl) prodDescEl.innerHTML = '<p>This product could not be loaded. Please check the product ID or try again later.</p>';
          }
        }
      } catch (err) {
        if (prodNameEl) prodNameEl.textContent = 'Error loading product';
        if (prodDescEl) prodDescEl.innerHTML = '<p>Unable to load product information.</p>';
      }

      renderReviews(loadReviewsFallback());
    }

    await fetchReviewEligibility();
  })();

  stars.forEach(s => {
    s.addEventListener('mouseover', function () {
      highlight(Number(this.dataset.value));
    });

    s.addEventListener('mouseout', function () {
      highlight(currentRating);
    });

    s.addEventListener('click', function () {
      if (!reviewEligibility.can_review) {
        applyReviewEligibility();
        return;
      }

      currentRating = Number(this.dataset.value);
      applySelectedStars(currentRating);
      if (reviewArea) reviewArea.style.display = 'flex';
      if (reviewText) reviewText.focus();
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async function () {
      const text = reviewText ? reviewText.value.trim() : '';

      if (!reviewEligibility.can_review) {
        alert('You can only review products you have purchased.');
        return;
      }

      if (currentRating <= 0) {
        alert('Please select a star rating first.');
        return;
      }

      if (!text) {
        alert('Please write a short review before submitting.');
        return;
      }

      const obj = { rating: currentRating, text: text, date: Date.now() };

      if (serverAvailable) {
        try {
          await postReviewToServer(obj);
          const data = await fetchProductFromServer();
          renderProduct(data);
          renderReviews(getReviewsFromPayload(data));
          await fetchReviewEligibility();
        } catch (err) {
          alert(err.message + ' Saving locally instead.');
          saveReviewFallback(obj);
          renderReviews(loadReviewsFallback());
        }
      } else {
        saveReviewFallback(obj);
        renderReviews(loadReviewsFallback());
      }

      if (!reviewEligibility.existing_review) {
        currentRating = 0;
        applySelectedStars(0);
        if (reviewText) reviewText.value = '';
      }
    });
  }

  function loadLikeFallback() {
    const raw = localStorage.getItem(LIKE_KEY);
    if (!raw) return false;
    try {
      const all = JSON.parse(raw);
      return !!all[productId];
    } catch (e) {
      return false;
    }
  }

  function saveLikeFallback(valu) {
    const raw = localStorage.getItem(LIKE_KEY);
    let all = {};
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch (e) {
        all = {};
      }
    }
    if (valu) all[productId] = true;
    else delete all[productId];
    localStorage.setItem(LIKE_KEY, JSON.stringify(all));
  }

  function loadWishlistFallback() {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function saveWishlistFallback(list) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  async function postLikeToServer(like) {
    const url = `${API_BASE}/api/products/${encodeURIComponent(productId)}/like`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: API_BASE ? 'include' : 'same-origin',
      headers: getSessionHeaders(true),
      body: JSON.stringify({ like: !!like })
    });
    if (!resp.ok) throw new Error('like-failed');
    return resp.json();
  }

  async function postWishlistToServer(add) {
    const url = `${API_BASE}/api/me/wishlist`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: API_BASE ? 'include' : 'same-origin',
      headers: getSessionHeaders(true),
      body: JSON.stringify({ productId: productId, add: !!add })
    });
    if (!resp.ok) throw new Error('wishlist-failed');
    return resp.json();
  }

  function updateLikeUI(isLiked) {
    if (!likeBtn) return;
    likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
    if (isLiked) {
      likeBtn.classList.add('liked');
      likeBtn.textContent = '♥ Liked';
    } else {
      likeBtn.classList.remove('liked');
      likeBtn.textContent = '♡ Like';
    }
  }

  function updateWishlistUI(inWishlist) {
    if (!wishlistBtn) return;
    wishlistBtn.setAttribute('aria-pressed', inWishlist ? 'true' : 'false');
    if (inWishlist) {
      wishlistBtn.classList.add('liked');
      wishlistBtn.textContent = '✔ In Wishlist';
    } else {
      wishlistBtn.classList.remove('liked');
      wishlistBtn.textContent = '♡ Add to Wishlist';
    }
  }

  (async function initButtons() {
    updateLikeUI(loadLikeFallback());
    updateWishlistUI(loadWishlistFallback().includes(productId));

    try {
      const resp = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}/state`, {
        credentials: API_BASE ? 'include' : 'same-origin',
        headers: getSessionHeaders()
      });
      if (resp.ok) {
        const json = await resp.json();
        if (typeof json.liked !== 'undefined') updateLikeUI(!!json.liked);
        if (typeof json.inWishlist !== 'undefined') updateWishlistUI(!!json.inWishlist);
        serverAvailable = true;
      }
    } catch (e) {}
  })();

  if (likeBtn) {
    likeBtn.addEventListener('click', async function () {
      const currently = likeBtn.getAttribute('aria-pressed') === 'true';
      const toSet = !currently;

      if (serverAvailable) {
        try {
          await postLikeToServer(toSet);
          updateLikeUI(toSet);
          return;
        } catch (e) {}
      }

      saveLikeFallback(toSet);
      updateLikeUI(toSet);
    });
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', async function () {
      const currently = wishlistBtn.getAttribute('aria-pressed') === 'true';
      const toSet = !currently;

      if (serverAvailable) {
        try {
          await postWishlistToServer(toSet);
          updateWishlistUI(toSet);
          return;
        } catch (e) {}
      }

      const list = loadWishlistFallback();
      if (toSet) {
        if (!list.includes(productId)) list.push(productId);
      } else {
        const idx = list.indexOf(productId);
        if (idx >= 0) list.splice(idx, 1);
      }
      saveWishlistFallback(list);
      updateWishlistUI(toSet);
    });
  }

  function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart || {}));
    } catch (e) {}
  }

  function cartTotalCount() {
    const cart = loadCart();
    let sum = 0;
    Object.values(cart).forEach(it => {
      sum += it.qty || 0;
    });
    return sum;
  }

  function applyCartCount(count) {
    if (cartCountEl) cartCountEl.textContent = String(count);
    const navCart = document.getElementById('nav-cart');
    if (navCart) {
      if (count > 0) navCart.classList.add('has-items');
      else navCart.classList.remove('has-items');
    }
  }

  function updateCartBadge() {
    applyCartCount(cartTotalCount());
  }

  window.refreshCartBadge = updateCartBadge;

  function showCartToast() {
    const t = document.getElementById('cart-toast');
    if (!t) return;
    t.classList.add('show');
    t.style.display = '';
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => {
        t.style.display = 'none';
      }, 200);
    }, 1800);
  }

  function addOrUpdateLocalCartItem(id, qty) {
    const cart = loadCart();
    if (!cart[id]) cart[id] = { id: id, qty: 0 };

    cart[id].qty = (cart[id].qty || 0) + qty;

    const pname = prodNameEl && prodNameEl.textContent ? prodNameEl.textContent.trim() : undefined;
    const pprice = prodPriceEl && prodPriceEl.textContent ? prodPriceEl.textContent.trim() : undefined;
    const imgEl = document.querySelector('.product_image img');
    const pimg = imgEl ? imgEl.src : undefined;

    if (pname) cart[id].name = pname;
    if (pprice) cart[id].price = pprice;
    if (pimg) cart[id].image = pimg;

    saveCart(cart);
    updateCartBadge();
    showCartToast();
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function () {
      if (addToCartBtn.disabled) return;
      addOrUpdateLocalCartItem(productId, 1);
    });
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', function () {
      if (buyNowBtn.disabled) return;
      addOrUpdateLocalCartItem(productId, 1);
      location.href = 'checkout.html';
    });
  }

  updateCartBadge();
});