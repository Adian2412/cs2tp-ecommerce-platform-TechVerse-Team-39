document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = (() => {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) {
      return '';
    }
  })();
  const AUTH_KEY = 'techverse_auth_user';
  const TOKEN_KEY = 'techverse_session_token';
  function getCurrentUser() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } }
  function getHeaders(withJson = false) { const h = { Accept: 'application/json' }; const t = localStorage.getItem(TOKEN_KEY); if (t) h['X-Session-Token'] = t; if (withJson) h['Content-Type'] = 'application/json'; return h; }
  function formatMoney(v) { return '£' + Number(v || 0).toFixed(2); }
  function formatDate(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString(); }
  function escapeHtml(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function displayOrderStatus(status) { const raw = String(status || 'pending').toLowerCase(); return raw === 'pending' ? 'Processing' : raw.charAt(0).toUpperCase() + raw.slice(1); }
  const currentUser = getCurrentUser();
  if (!currentUser) { alert('Please sign in to view your account.'); location.href = 'signin.html'; return; }
  const nameEl = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  if (nameEl) nameEl.value = currentUser.username || currentUser.name || '';
  if (emailEl) emailEl.value = currentUser.email || '';
  const saveBtn = document.getElementById('save-account');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, { method: 'PUT', headers: getHeaders(true), credentials: 'include', body: JSON.stringify({ name: (nameEl.value || '').trim(), email: (emailEl.value || '').trim() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || data.message || 'Unable to save account details.');
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user)); alert('Account details updated successfully.');
    } catch (error) { alert(error.message); }
  });
  const changePassBtn = document.getElementById('change-pass');
  if (changePassBtn) changePassBtn.addEventListener('click', async () => {
    const currentPassword = (document.getElementById('acc-curpass') || {}).value || '';
    const newPassword = (document.getElementById('acc-newpass') || {}).value || '';
    if (!currentPassword || !newPassword) { alert('Please enter both your current password and a new password.'); return; }
    try {
      const response = await fetch(`${API_BASE}/api/change-password`, { method: 'POST', headers: getHeaders(true), credentials: 'include', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || data.message || 'Unable to change password.');
      alert('Password changed successfully.'); document.getElementById('acc-curpass').value = ''; document.getElementById('acc-newpass').value = '';
    } catch (error) { alert(error.message); }
  });
  const signoutBtn = document.getElementById('signout');
  if (signoutBtn) signoutBtn.addEventListener('click', async () => {
    try { await fetch(`${API_BASE}/api/logout`, { method: 'POST', headers: getHeaders(), credentials: 'include' }); } catch (e) {}
    localStorage.removeItem(AUTH_KEY); localStorage.removeItem(TOKEN_KEY); location.href = 'index.html';
  });
  const sellBtn = document.getElementById('sell-product'); if (sellBtn) sellBtn.addEventListener('click', () => { location.href = 'seller.html'; });
  async function loadUserProducts() {
    try {
      const response = await fetch(`${API_BASE}/api/my-products`, { headers: getHeaders(), credentials: 'include' });
      if (!response.ok) return []; const data = await response.json();
      if (Array.isArray(data)) return data; if (Array.isArray(data.data)) return data.data; if (Array.isArray(data.products)) return data.products; return [];
    } catch (e) { return []; }
  }
  async function renderAccountListings() {
    const wrap = document.getElementById('account-listings'); if (!wrap) return; wrap.innerHTML = '<p class="muted">Loading your listings...</p>';
    const items = await loadUserProducts();
    if (!items.length) { wrap.innerHTML = '<p class="muted">You have no listings yet. <a href="seller.html">Sell a product</a></p>'; return; }
    wrap.innerHTML = '';
    items.forEach(item => {
      const stock = Number(item.stock || 0);
      const image = (item.images && item.images[0] && item.images[0].image_path) || item.image_url || 'https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse';
      const card = document.createElement('div'); card.className = 'listing-card';
      card.innerHTML = `<img class="listing-thumb" src="${image}" alt="${escapeHtml(item.name || 'Product')}" onerror="this.src='https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse'"><div class="listing-info"><div class="listing-title">${escapeHtml(item.name || 'Untitled product')}</div><div class="listing-price">${formatMoney(item.price || 0)}</div><div class="listing-meta">${escapeHtml(item.description || '')}</div><div class="listing-meta">Stock: ${stock}</div></div>`;
      wrap.appendChild(card);
    });
  }
  function renderReturnBadge(item) {
    const returns = Array.isArray(item.returns) ? item.returns : []; if (!returns.length) return '';
    const latest = returns[0]; return `<div class="order-meta"><strong>Return:</strong> ${escapeHtml(latest.status)}${latest.reason ? ' · ' + escapeHtml(latest.reason) : ''}</div>`;
  }
  function createActionButton(label, className, onClick) { const btn = document.createElement('button'); btn.className = className; btn.textContent = label; btn.type = 'button'; btn.addEventListener('click', onClick); return btn; }
  async function renderPlacedOrders() {
    const wrap = document.getElementById('placed-orders'); if (!wrap) return; wrap.innerHTML = '<p class="muted">Loading your orders...</p>';
    try {
      const response = await fetch(`${API_BASE}/api/my-orders`, { headers: getHeaders(), credentials: 'include' });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load orders.');
      const orders = Array.isArray(data.orders) ? data.orders : []; if (!orders.length) { wrap.innerHTML = '<p class="muted">You have no orders yet.</p>'; return; }
      wrap.innerHTML = '';
      orders.forEach(order => {
        const firstItem = order.items && order.items[0] ? order.items[0] : null;
        const product = firstItem && firstItem.variant ? firstItem.variant.product : null;
        const image = product && product.image_url ? product.image_url : 'https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse';
        const title = product && product.name ? product.name : 'Order #' + order.id;
        const qty = order.items ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
        const orderStatus = String(order.status || '').toLowerCase();
        const eligibleForReturn = ['paid', 'shipped', 'delivered'].includes(orderStatus) && (order.items || []).some(item => !(Array.isArray(item.returns) && item.returns.length));
        const card = document.createElement('div'); card.className = 'order-card';
        const itemLines = (order.items || []).map(item => {
          const p = item.variant && item.variant.product ? item.variant.product : null;
          const resolvedProductId = (p && p.id) || (item.variant && item.variant.product_id) || null;
          const name = p && p.name ? p.name : 'Item #' + item.id;
          return `<div class="order-meta">${escapeHtml(name)} · Qty ${Number(item.quantity || 0)} · ${formatMoney(item.unit_price || 0)} each</div>${renderReturnBadge(item)}${resolvedProductId ? `<div class="order-meta" style="margin-top:4px;"><a href="product_page.html?id=${encodeURIComponent(resolvedProductId)}&review=1" class="order-review-link">Review product</a></div>` : ''}`;
        }).join('');
        card.innerHTML = `<div class="order-head"><div class="order-id">Order #${order.id}</div><div class="order-status status-${String(order.status || 'pending').toLowerCase().replace(/[^a-z]/g,'')}">${escapeHtml(displayOrderStatus(order.status || 'pending'))}</div></div><div class="order-items"><img class="order-thumb" src="${image}" alt="${escapeHtml(title)}" onerror="this.src='https://dummyimage.com/600x400/f2f4f7/1c3846&text=Tech+Verse'"><div class="order-info"><div class="listing-title">${escapeHtml(title)}</div><div class="order-meta">Placed: ${formatDate(order.created_at)} · Items: ${qty} · Total: ${formatMoney(order.total)}</div>${itemLines}</div></div>`;
        const actions = document.createElement('div'); actions.className = 'order-actions';
        actions.appendChild(createActionButton('View Order', 'btn-view', () => { alert(`Order #${order.id}\nStatus: ${displayOrderStatus(order.status)}\nTotal: ${formatMoney(order.total)}`); }));
        if (eligibleForReturn) actions.appendChild(createActionButton('Request Return', 'btn-return', () => { location.href = `returns.html?order=${encodeURIComponent(order.id)}`; }));
        (order.items || []).forEach(item => {
          const p = item.variant && item.variant.product ? item.variant.product : null;
          const resolvedProductId = (p && p.id) || (item.variant && item.variant.product_id) || null;
          const label = p && p.name ? `Review: ${p.name}` : 'Review Product';
          if (!resolvedProductId) return;
          actions.appendChild(createActionButton(label, 'btn-view', () => { location.href = `product_page.html?id=${encodeURIComponent(resolvedProductId)}&review=1`; }));
        });
        card.appendChild(actions); wrap.appendChild(card);
      });
    } catch (error) { wrap.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`; }
  }
  async function loadServiceReview() {
    const statusEl = document.getElementById('service-review-status'); const ratingEl = document.getElementById('service-rating'); const commentEl = document.getElementById('service-comment'); if (!statusEl || !ratingEl || !commentEl) return;
    statusEl.textContent = 'Loading your service review...';
    try {
      const response = await fetch(`${API_BASE}/api/service-reviews/me`, { headers: getHeaders(), credentials: 'include' });
      const data = await response.json(); if (!response.ok && response.status !== 404) throw new Error(data.error || 'Unable to load your service review.');
      const review = data.review || null;
      if (review) { ratingEl.value = String(review.rating || 5); commentEl.value = review.comment || ''; statusEl.textContent = `Your current service review was last saved on ${formatDate(review.updated_at || review.created_at)}.`; }
      else statusEl.textContent = 'You have not left an overall service review yet.';
    } catch (error) { statusEl.textContent = error.message; }
  }
  const saveServiceReviewBtn = document.getElementById('save-service-review');
  if (saveServiceReviewBtn) saveServiceReviewBtn.addEventListener('click', async () => {
    const rating = Number((document.getElementById('service-rating') || {}).value || 5); const comment = ((document.getElementById('service-comment') || {}).value || '').trim(); const statusEl = document.getElementById('service-review-status');
    try {
      const response = await fetch(`${API_BASE}/api/service-reviews`, { method: 'POST', headers: getHeaders(true), credentials: 'include', body: JSON.stringify({ rating, comment }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || data.message || 'Unable to save service review.');
      statusEl.textContent = 'Service review saved successfully.'; await loadServiceReview();
    } catch (error) { statusEl.textContent = error.message; }
  });
  renderAccountListings(); renderPlacedOrders(); loadServiceReview();
});
