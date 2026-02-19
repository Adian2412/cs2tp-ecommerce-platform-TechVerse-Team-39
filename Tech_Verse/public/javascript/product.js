document.addEventListener('DOMContentLoaded', function () {
  // Elements
  const stars = Array.from(document.querySelectorAll('#prodstar .star'));
  const reviewArea = document.getElementById('review-area');
  const reviewText = document.getElementById('review-text');
  const submitBtn = document.getElementById('submit-review');
  const reviewsList = document.getElementById('reviews-list');
  const prodNameEl = document.getElementById('prodname');
  const prodPriceEl = document.getElementById('prodprice');
  const prodDescEl = document.querySelector('.product_description');

  // Local fallback key and default product id
  const PRODUCT_KEY = 'techverse_product_reviews_v1';
  // Try to derive product id from URL (query param ?id=...), otherwise fallback
  const urlParams = new URLSearchParams(location.search);
  const productId = urlParams.get('id') || 'product-1';

  // Server availability flag - if true, read/write will use server endpoints
  let serverAvailable = false;

  // --- LocalStorage fallback helpers ---
  function loadReviewsFallback() {
    const raw = localStorage.getItem(PRODUCT_KEY);
    if (!raw) return [];
    try {
      const all = JSON.parse(raw);
      return all[productId] || [];
    } catch (e) {
      console.error('Failed to parse reviews', e);
      return [];
    }
  }

  function saveReviewFallback(obj) {
    const raw = localStorage.getItem(PRODUCT_KEY);
    let all = {};
    if (raw) {
      try { all = JSON.parse(raw); } catch (e) { all = {}; }
    }
    all[productId] = all[productId] || [];
    all[productId].push(obj);
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(all));
  }

  // --- Server API helpers ---
  async function fetchProductFromServer() {
    // Expected server shape:
    // { id, name, price, description, reviews: [{rating, text, author, date}] }
    const url = `/api/products/${encodeURIComponent(productId)}`;
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('no-server');
    return resp.json();
  }

  async function postReviewToServer(review) {
    // POST { rating, text } -> returns created review object
    const url = `/api/products/${encodeURIComponent(productId)}/reviews`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: review.rating, text: review.text })
    });
    if (!resp.ok) throw new Error('post-failed:' + resp.status);
    return resp.json();
  }

  // --- Rendering ---
  function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
  }

  function renderProduct(data){
    if (!data) return;
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    if (prodNameEl && data.name) prodNameEl.textContent = data.name;
    if (prodPriceEl && (typeof data.price !== 'undefined' && data.price !== null)) prodPriceEl.textContent = fmt(data.price);
    if (prodDescEl && data.description) prodDescEl.innerHTML = `<p>${escapeHtml(data.description)}</p>`;
    // set document title
    try{ if(data.name) document.title = data.name + ' — Tech Verse'; }catch(e){}
    // render image if available
    try{
      const imgWrap = document.querySelector('.product_image');
      if(imgWrap){
        const src = (data.images && data.images[0]) || 'images/placeholder.png';
        imgWrap.innerHTML = `<img src="${src}" alt="${escapeHtml(data.name||'Product')}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;
      }
    }catch(e){}
  }

  function renderReviews(items){
    if (!reviewsList) return;
    reviewsList.innerHTML = '';
    if (!items || !items.length) {
      reviewsList.innerHTML = '<p style="color:#666;">No reviews yet — be the first to review.</p>';
      return;
    }
    items.slice().reverse().forEach(r => {
      const el = document.createElement('div');
      el.className = 'review-item';
      const author = r.author || 'Anonymous';
      const date = r.date ? new Date(r.date).toLocaleString() : '';
      el.innerHTML = `\n        <div class="meta">${'★'.repeat(r.rating || 0)} ${r.rating || 0} · ${escapeHtml(author)} · ${escapeHtml(date)}</div>\n        <div class="text">${escapeHtml(r.text)}</div>\n      `;
      reviewsList.appendChild(el);
    });
  }

  // --- Initialization: prefer server, fallback to local ---
  (async function initData(){
    try {
      const data = await fetchProductFromServer();
      serverAvailable = true;
      // render product and server-provided reviews
      renderProduct(data);
      renderReviews(data.reviews || []);
    } catch (e) {
      serverAvailable = false;
      // fallback to local data: try to load product details from local listings
      try{
        const raw = localStorage.getItem('techverse_listings_v1');
        if(raw){
          const list = JSON.parse(raw) || [];
          const found = list.find(x => String(x.id) === String(productId));
          if(found){
            // render product details from listing
            const p = {
              id: found.id,
              name: found.title || found.name || ('Product ' + found.id),
              price: (typeof found.price !== 'undefined') ? found.price : found.price_str || null,
              description: found.desc || found.description || '',
              images: found.images || []
            };
            renderProduct(p);
          }
        }
      }catch(err){ /* ignore parse errors */ }
      // reviews still come from local reviews fallback
      renderReviews(loadReviewsFallback());
    }
  })();

  // --- Star interactions and review submission ---
  let currentRating = 0;

  function highlight(upto) {
    stars.forEach(s => {
      const v = Number(s.dataset.value);
      if (v <= upto) s.classList.add('hover'); else s.classList.remove('hover');
    });
  }

  stars.forEach(s => {
    s.addEventListener('mouseover', function (){
      highlight(Number(this.dataset.value));
    });
    s.addEventListener('mouseout', function (){
      highlight(currentRating);
    });
    s.addEventListener('click', function (){
      currentRating = Number(this.dataset.value);
      // mark selected
      stars.forEach(x => {
        const v = Number(x.dataset.value);
        if (v <= currentRating) x.classList.add('selected'); else x.classList.remove('selected');
      });
      // show review form
      if (reviewArea) reviewArea.style.display = 'flex';
      if (reviewText) reviewText.focus();
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async function (){
      const text = reviewText ? reviewText.value.trim() : '';
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
          // send to server and re-fetch or append returned review
          const created = await postReviewToServer(obj);
          // if server returns full product or reviews, re-fetch; otherwise append
          if (created && created.product) {
            renderProduct(created.product);
            renderReviews(created.product.reviews || []);
          } else if (created && created.review) {
            // append the created review to the list
            const cur = loadReviewsFallback(); // still show fallback + server reviews if any
            renderReviews([...(cur || []), created.review]);
          } else {
            // best-effort: re-fetch product
            try {
              const data = await fetchProductFromServer();
              renderProduct(data);
              renderReviews(data.reviews || []);
            } catch (e) { /* ignore */ }
          }
        } catch (err) {
          console.warn('Server post failed, saving locally as fallback', err);
          saveReviewFallback(obj);
          renderReviews(loadReviewsFallback());
        }
      } else {
        // local fallback
        saveReviewFallback(obj);
        renderReviews(loadReviewsFallback());
      }

      // reset form
      if (reviewText) reviewText.value = '';
      currentRating = 0;
      stars.forEach(x => x.classList.remove('selected','hover'));
      if (reviewArea) reviewArea.style.display = 'none';
    });
  }

  // --- Like and Wishlist handling (server-first, local fallback) ---
  const likeBtn = document.getElementById('like-button');
  const wishlistBtn = document.getElementById('wishlist-button');

  // local storage keys for fallback
  const LIKE_KEY = 'techverse_product_likes_v1';
  const WISHLIST_KEY = 'techverse_wishlist_v1';

  function getCurrentUser(){
    try{
      return JSON.parse(localStorage.getItem('techverse_auth_user') || 'null');
    }catch(e){return null;}
  }

  function loadLikeFallback(){
    const raw = localStorage.getItem(LIKE_KEY);
    if(!raw) return false;
    try{ const all = JSON.parse(raw); return !!all[productId]; }catch(e){return false;}
  }

  function saveLikeFallback(valu){
    const raw = localStorage.getItem(LIKE_KEY);
    let all = {};
    if (raw) { try{ all = JSON.parse(raw); }catch(e){ all = {}; } }
    if(valu) all[productId] = true; else delete all[productId];
    localStorage.setItem(LIKE_KEY, JSON.stringify(all));
  }

  function loadWishlistFallback(){
    const raw = localStorage.getItem(WISHLIST_KEY);
    if(!raw) return [];
    try{ return JSON.parse(raw); }catch(e){return [];}
  }

  function saveWishlistFallback(list){
    try{ localStorage.setItem(WISHLIST_KEY, JSON.stringify(list || [])); }catch(e){}
  }

  async function postLikeToServer(like){
    const url = `/api/products/${encodeURIComponent(productId)}/like`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ like: !!like })
    });
    if(!resp.ok) throw new Error('like-failed');
    return resp.json();
  }

  async function postWishlistToServer(add){
    // POST to current user's wishlist endpoint
    const url = `/api/me/wishlist`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ productId: productId, add: !!add })
    });
    if(!resp.ok) throw new Error('wishlist-failed');
    return resp.json();
  }

  function updateLikeUI(isLiked){
    if(!likeBtn) return;
    likeBtn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
    if(isLiked){ likeBtn.classList.add('liked'); likeBtn.textContent = '♥ Liked'; }
    else { likeBtn.classList.remove('liked'); likeBtn.textContent = '♡ Like'; }
  }

  function updateWishlistUI(inWishlist){
    if(!wishlistBtn) return;
    wishlistBtn.setAttribute('aria-pressed', inWishlist ? 'true' : 'false');
    if(inWishlist){ wishlistBtn.classList.add('liked'); wishlistBtn.textContent = '✔ In Wishlist'; }
    else { wishlistBtn.classList.remove('liked'); wishlistBtn.textContent = '♡ Add to Wishlist'; }
  }

  // initialize states from server or fallback
  (async function initButtons(){
    // default from fallback
    const likeFallback = loadLikeFallback();
    const wishlistFallback = loadWishlistFallback().includes(productId);
    updateLikeUI(likeFallback);
    updateWishlistUI(wishlistFallback);
    // try server for authoritative state
    try{
      const resp = await fetch(`/api/products/${encodeURIComponent(productId)}/state`, { credentials: 'same-origin' });
      if(resp.ok){
        const json = await resp.json();
        // server response shape: { liked: bool, inWishlist: bool }
        if(typeof json.liked !== 'undefined') updateLikeUI(!!json.liked);
        if(typeof json.inWishlist !== 'undefined') updateWishlistUI(!!json.inWishlist);
        serverAvailable = true;
      }
    }catch(e){ /* ignore, keep fallback */ }
  })();

  if(likeBtn){
    likeBtn.addEventListener('click', async function(){
      const user = getCurrentUser();
      const currently = likeBtn.getAttribute('aria-pressed') === 'true';
      const toSet = !currently;
      // server-first
      if(serverAvailable){
        try{
          await postLikeToServer(toSet);
          updateLikeUI(toSet);
          return;
        }catch(e){ console.warn('like post failed, falling back', e); }
      }
      // fallback
      saveLikeFallback(toSet);
      updateLikeUI(toSet);
    });
  }

  if(wishlistBtn){
    wishlistBtn.addEventListener('click', async function(){
      const user = getCurrentUser();
      const currently = wishlistBtn.getAttribute('aria-pressed') === 'true';
      const toSet = !currently;
      if(serverAvailable){
        try{
          await postWishlistToServer(toSet);
          updateWishlistUI(toSet);
          return;
        }catch(e){ console.warn('wishlist post failed, falling back', e); }
      }
      const list = loadWishlistFallback();
      if(toSet){
        if(!list.includes(productId)) list.push(productId);
      } else {
        const idx = list.indexOf(productId); if(idx>=0) list.splice(idx,1);
      }
      saveWishlistFallback(list);
      updateWishlistUI(toSet);
    });
  }

  // --- Add to Cart feature ---
  const addToCartBtn = document.getElementById('add-to-cart');
  const cartCountEl = document.getElementById('cart-count');
  const CART_KEY = 'techverse_cart_v1';

  function loadCart(){
    const raw = localStorage.getItem(CART_KEY);
    if(!raw) return {};
    try{ return JSON.parse(raw); }catch(e){ return {}; }
  }

  function saveCart(cart){
    try{ localStorage.setItem(CART_KEY, JSON.stringify(cart || {})); }catch(e){}
  }

  function cartTotalCount(){
    const cart = loadCart(); let sum = 0;
    Object.values(cart).forEach(it => { sum += (it.qty||0); });
    return sum;
  }

  function updateCartBadge(){
    const count = cartTotalCount();
    if(cartCountEl) cartCountEl.textContent = String(count);
    // if nav-cart exists, add a visual indicator
    const navCart = document.getElementById('nav-cart');
    if(navCart) {
      if(count>0) navCart.classList.add('has-items'); else navCart.classList.remove('has-items');
    }
  }

  async function serverAddToCart(productId, qty){
    const url = `/api/cart/add`;
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ productId: productId, qty: qty })
    });
    if(!resp.ok) throw new Error('cart-add-failed');
    return resp.json();
  }

  function showCartToast(){
    const t = document.getElementById('cart-toast');
    if(!t) return;
    t.classList.add('show'); t.style.display = '';
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>{ t.style.display='none'; },200); }, 1800);
  }

  if(addToCartBtn){
    addToCartBtn.addEventListener('click', async function(){
      const qty = 1;
      if(serverAvailable){
        try{
          await serverAddToCart(productId, qty);
          // try to fetch updated cart count from server (optional)
          try{
            const r = await fetch('/api/cart', { credentials: 'same-origin' });
            if(r.ok){ const js = await r.json(); if(typeof js.count !== 'undefined'){ if(cartCountEl) cartCountEl.textContent = String(js.count); } }
          }catch(e){}
          showCartToast();
          updateCartBadge();
          if(window.refreshCartBadge) window.refreshCartBadge();
          return;
        }catch(e){ console.warn('server add to cart failed, falling back', e); }
      }
      // fallback: store in localStorage map { productId: {id, qty, name?, price?} }
      const cart = loadCart();
      if(!cart[productId]) cart[productId] = { id: productId, qty: 0 };
      cart[productId].qty = (cart[productId].qty || 0) + qty;
      // optionally store product name/price if available
      const pname = (prodNameEl && prodNameEl.textContent) ? prodNameEl.textContent.trim() : undefined;
      const pprice = (prodPriceEl && prodPriceEl.textContent) ? prodPriceEl.textContent.trim() : undefined;
      if(pname) cart[productId].name = pname;
      if(pprice) cart[productId].price = pprice;
      saveCart(cart);
      updateCartBadge();
      if(window.refreshCartBadge) window.refreshCartBadge();
      showCartToast();
    });
  }

  // Buy Now: add this product to cart then go straight to checkout
  const buyNowBtn = document.getElementById('buy-now');
  if(buyNowBtn){
    buyNowBtn.addEventListener('click', async function(){
      const qty = 1;
      if(serverAvailable){
        try{
          await serverAddToCart(productId, qty);
          // redirect to checkout after server add
          location.href = 'checkout.html';
          return;
        }catch(e){ console.warn('server buy-now failed, falling back', e); }
      }
      // fallback: add to localStorage cart then redirect
      const cart = loadCart();
      if(!cart[productId]) cart[productId] = { id: productId, qty: 0 };
      cart[productId].qty = (cart[productId].qty || 0) + qty;
      const pname = (prodNameEl && prodNameEl.textContent) ? prodNameEl.textContent.trim() : undefined;
      const pprice = (prodPriceEl && prodPriceEl.textContent) ? prodPriceEl.textContent.trim() : undefined;
      if(pname) cart[productId].name = pname;
      if(pprice) cart[productId].price = pprice;
      try{ localStorage.setItem(CART_KEY, JSON.stringify(cart || {})); }catch(e){}
      if(window.refreshCartBadge) window.refreshCartBadge();
      // go to checkout with the updated cart
      location.href = 'checkout.html';
    });
  }

  // update badge on load
  updateCartBadge();
  if(window.refreshCartBadge) window.refreshCartBadge();

});
