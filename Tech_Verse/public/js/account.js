// account.js - final wired version for Laravel backend
document.addEventListener('DOMContentLoaded', async () => {
  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) { return ''; }
  }

  const API_BASE = apiBase();

  function apiUrl(path) {
    return `${API_BASE}${path}`;
  }

  function getHeaders(withJson = false) {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('techverse_session_token');
    if (token) headers['X-Session-Token'] = token;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(value) {
    const num = Number(value || 0);
    return '£' + num.toFixed(2);
  }

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString();
  }

  function setMessage(el, message, ok = true) {
    if (!el) return;
    el.textContent = message || '';
    el.style.color = ok ? '#1f6a2e' : '#b42318';
  }

  async function fetchCurrentUser() {
    const res = await fetch(apiUrl('/api/auth/me'), {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(true),
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    if (!data.authenticated || !data.user) throw new Error('Not authenticated');
    return data.user;
  }

  let currentUser = null;
  try {
    currentUser = await fetchCurrentUser();
    localStorage.setItem('techverse_auth_user', JSON.stringify(currentUser));
  } catch (e) {
    location.href = 'signin.html';
    return;
  }

  // Populate account header/profile
  const nameEl = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  if (nameEl) nameEl.value = currentUser.name || '';
  if (emailEl) emailEl.value = currentUser.email || '';
  const navName = document.getElementById('nav-name');
  const navEmail = document.getElementById('nav-email');
  const navAvatar = document.getElementById('nav-avatar');
  if (navName) navName.textContent = currentUser.name || 'User';
  if (navEmail) navEmail.textContent = currentUser.email || '';
  if (navAvatar) navAvatar.textContent = (currentUser.name || '?').trim().charAt(0).toUpperCase() || '?';

  // Profile save
  const accountMsg = document.getElementById('account-msg');
  const saveBtn = document.getElementById('save-account');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      setMessage(accountMsg, 'Saving changes...', true);
      try {
        const res = await fetch(apiUrl(`/api/users/${currentUser.id}`), {
          method: 'PUT',
          credentials: 'include',
          headers: getHeaders(true),
          body: JSON.stringify({ name: (nameEl?.value || '').trim(), email: (emailEl?.value || '').trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Unable to save account details.');
        currentUser = data.user || currentUser;
        localStorage.setItem('techverse_auth_user', JSON.stringify(currentUser));
        if (navName) navName.textContent = currentUser.name || 'User';
        if (navEmail) navEmail.textContent = currentUser.email || '';
        if (navAvatar) navAvatar.textContent = (currentUser.name || '?').trim().charAt(0).toUpperCase() || '?';
        setMessage(accountMsg, 'Account details updated successfully.', true);
      } catch (error) {
        setMessage(accountMsg, error.message, false);
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  // Change password
  const passMsg = document.getElementById('pass-msg');
  const changePassBtn = document.getElementById('change-pass');
  if (changePassBtn) {
    changePassBtn.addEventListener('click', async () => {
      const currentPassword = document.getElementById('acc-curpass')?.value || '';
      const newPassword = document.getElementById('acc-newpass')?.value || '';
      if (!currentPassword || !newPassword) {
        setMessage(passMsg, 'Please enter both your current password and a new password.', false);
        return;
      }
      changePassBtn.disabled = true;
      setMessage(passMsg, 'Updating password...', true);
      try {
        const res = await fetch(apiUrl('/api/change-password'), {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(true),
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Unable to change password.');
        document.getElementById('acc-curpass').value = '';
        document.getElementById('acc-newpass').value = '';
        setMessage(passMsg, 'Password changed successfully.', true);
      } catch (error) {
        setMessage(passMsg, error.message, false);
      } finally {
        changePassBtn.disabled = false;
      }
    });
  }

  // Sign out
  const signoutBtn = document.getElementById('signout');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      try {
        await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include', headers: getHeaders(true), body: JSON.stringify({}) });
      } catch (e) {}
      localStorage.removeItem('techverse_auth_user');
      localStorage.removeItem('techverse_session_token');
      location.href = 'index.html';
    });
  }

  // My listings / sell a product
  const accountListings = document.getElementById('account-listings');
  const sellMsg = document.getElementById('sell-msg');

  async function loadMyProducts() {
    const res = await fetch(apiUrl('/api/my-products?per_page=200'), { credentials: 'include', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to load your listings.');
    return Array.isArray(data.data) ? data.data : (Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []));
  }

  function renderListings(items) {
    if (!accountListings) return;
    accountListings.innerHTML = '';
    if (!items.length) {
      accountListings.innerHTML = '<p class="tv-muted">You have no listings yet.</p>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'tv-order-card';
      card.style.marginBottom = '12px';
      const image = (item.images && item.images[0] && item.images[0].image_path) || item.image_url || 'images/placeholder.png';
      const stock = item.variants && item.variants[0] && item.variants[0].stock ? Number(item.variants[0].stock.quantity || 0) : Number(item.stock || 0);
      const price = item.variants && item.variants[0] ? Number(item.variants[0].price || item.price || 0) : Number(item.price || 0);
      card.innerHTML = `
        <div class="tv-order-card__body" style="display:flex;gap:14px;align-items:flex-start;">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(item.name || 'Product')}" style="width:86px;height:86px;object-fit:cover;border-radius:10px;border:1px solid var(--tv-border);" onerror="this.src='images/placeholder.png'">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(item.name || 'Untitled product')}</div>
            <div class="tv-muted" style="font-size:13px;margin-bottom:6px;">${escapeHtml(item.description || '')}</div>
            <div style="font-size:13px;color:var(--tv-text-2);">Price: ${formatMoney(price)} · Stock: ${stock} · ${item.active ? 'Active' : 'Inactive'}</div>
          </div>
        </div>`;
      accountListings.appendChild(card);
    });
  }

  async function refreshListings() {
    if (!accountListings) return;
    accountListings.innerHTML = '<p class="tv-muted">Loading your listings...</p>';
    try {
      const items = await loadMyProducts();
      renderListings(items);
    } catch (e) {
      accountListings.innerHTML = `<p class="tv-muted">${escapeHtml(e.message)}</p>`;
    }
  }

  const sellBtn = document.getElementById('sell-product');
  if (sellBtn) {
    sellBtn.addEventListener('click', async () => {
      const payload = {
        name: (document.getElementById('sell-name')?.value || '').trim(),
        category: (document.getElementById('sell-category')?.value || '').trim(),
        price: (document.getElementById('sell-price')?.value || '').trim(),
        stock: (document.getElementById('sell-stock')?.value || '').trim(),
        brand: (document.getElementById('sell-brand')?.value || '').trim(),
        image_url: (document.getElementById('sell-image')?.value || '').trim(),
        description: (document.getElementById('sell-description')?.value || '').trim(),
      };

      if (!payload.name || !payload.category || !payload.price || !payload.stock) {
        setMessage(sellMsg, 'Please fill in the product name, category, price and stock quantity.', false);
        return;
      }

      sellBtn.disabled = true;
      setMessage(sellMsg, 'Creating listing...', true);
      try {
        const res = await fetch(apiUrl('/api/products'), {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(true),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Unable to create listing.');
        ['sell-name','sell-category','sell-price','sell-stock','sell-brand','sell-image','sell-description'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        setMessage(sellMsg, 'Product listed successfully.', true);
        refreshListings();
      } catch (error) {
        setMessage(sellMsg, error.message, false);
      } finally {
        sellBtn.disabled = false;
      }
    });
  }

  // Orders
  const ordersWrap = document.getElementById('placed-orders');

  function renderReturnBadge(item) {
    const returns = Array.isArray(item.returns) ? item.returns : [];
    if (!returns.length) return '';
    const latest = returns[0];
    return `<div class="tv-muted" style="font-size:12px;margin-top:4px;"><strong>Return:</strong> ${escapeHtml(latest.status)}${latest.reason ? ' · ' + escapeHtml(latest.reason) : ''}</div>`;
  }

  function createActionButton(label, className, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = label;
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderOrders(orders) {
    if (!ordersWrap) return;
    ordersWrap.innerHTML = '';
    if (!orders.length) {
      ordersWrap.innerHTML = '<p class="tv-muted">You have no orders yet.</p>';
      return;
    }

    orders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'tv-order-card';
      const itemsHtml = (order.items || []).map(item => {
        const product = item.variant && item.variant.product ? item.variant.product : null;
        const productId = (product && product.id) || (item.variant && item.variant.product_id) || null;
        return `
          <div style="padding:10px 0;border-bottom:1px solid var(--tv-border);">
            <div style="font-weight:600;">${escapeHtml(product && product.name ? product.name : 'Product')}</div>
            <div class="tv-muted" style="font-size:13px;">Qty: ${Number(item.quantity || 0)} · ${formatMoney(item.unit_price || 0)} each</div>
            ${renderReturnBadge(item)}
            ${productId ? `<div style="margin-top:6px;"><a href="product_page.html?id=${encodeURIComponent(productId)}&review=1" style="color:var(--tv-primary);font-size:13px;font-weight:600;">Review product</a></div>` : ''}
          </div>`;
      }).join('');

      card.innerHTML = `
        <div class="tv-order-card__head">
          <strong>Order #${order.id}</strong>
          <span>Status: ${escapeHtml(order.status || 'pending')}</span>
          <span>Placed: ${formatDate(order.created_at)}</span>
          <span>Total: ${formatMoney(order.total)}</span>
        </div>
        <div class="tv-order-card__body">${itemsHtml || '<p class="tv-muted">No item details available.</p>'}</div>`;

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 16px;';
      actions.appendChild(createActionButton('View Order', 'tv-btn tv-btn--ghost', () => {
        alert(`Order #${order.id}\nStatus: ${order.status}\nTotal: ${formatMoney(order.total)}`);
      }));

      const orderStatus = String(order.status || '').toLowerCase();
      const eligibleForReturn = ['paid', 'shipped', 'delivered'].includes(orderStatus) && (order.items || []).some(item => !(Array.isArray(item.returns) && item.returns.length));
      if (eligibleForReturn) {
        actions.appendChild(createActionButton('Request Return', 'tv-btn tv-btn--ghost', () => {
          location.href = `returns.html?order=${encodeURIComponent(order.id)}`;
        }));
      }

      const reviewableItems = (order.items || []).filter(item => {
        const product = item.variant && item.variant.product ? item.variant.product : null;
        return !!((product && product.id) || (item.variant && item.variant.product_id));
      });
      reviewableItems.forEach(item => {
        const product = item.variant && item.variant.product ? item.variant.product : null;
        const productId = (product && product.id) || (item.variant && item.variant.product_id);
        const label = product && product.name ? `Review: ${product.name}` : 'Review Product';
        actions.appendChild(createActionButton(label, 'tv-btn tv-btn--ghost', () => {
          location.href = `product_page.html?id=${encodeURIComponent(productId)}&review=1`;
        }));
      });

      card.appendChild(actions);
      ordersWrap.appendChild(card);
    });
  }

  async function loadOrders() {
    if (!ordersWrap) return;
    ordersWrap.innerHTML = '<p class="tv-muted">Loading orders...</p>';
    try {
      const res = await fetch(apiUrl('/api/my-orders'), { credentials: 'include', headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load orders.');
      renderOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      ordersWrap.innerHTML = `<p class="tv-muted">${escapeHtml(e.message || 'Could not load orders.')}</p>`;
    }
  }

  // Service review
  const serviceStatus = document.getElementById('service-review-status');
  const serviceSaveBtn = document.getElementById('save-service-review');
  const serviceDeleteBtn = document.getElementById('delete-service-review');
  const serviceRatingEl = document.getElementById('service-rating');
  const serviceCommentEl = document.getElementById('service-comment');
  let existingServiceReview = null;

  function setServiceMessage(msg, ok = true) {
    setMessage(serviceStatus, msg, ok);
  }

  async function loadServiceReview() {
    if (!serviceRatingEl || !serviceCommentEl) return;
    try {
      const res = await fetch(apiUrl('/api/service-reviews/me'), { credentials: 'include', headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load service review.');
      existingServiceReview = data.review || null;
      if (existingServiceReview) {
        serviceRatingEl.value = String(existingServiceReview.rating || 5);
        serviceCommentEl.value = existingServiceReview.comment || '';
        if (serviceDeleteBtn) serviceDeleteBtn.style.display = '';
        setServiceMessage('Your existing service review is loaded below. You can update it any time.', true);
      } else {
        serviceRatingEl.value = '5';
        serviceCommentEl.value = '';
        if (serviceDeleteBtn) serviceDeleteBtn.style.display = 'none';
        setServiceMessage('', true);
      }
    } catch (e) {
      setServiceMessage(e.message, false);
    }
  }

  if (serviceSaveBtn) {
    serviceSaveBtn.addEventListener('click', async () => {
      const rating = Number(serviceRatingEl?.value || 5);
      const comment = (serviceCommentEl?.value || '').trim();
      serviceSaveBtn.disabled = true;
      setServiceMessage('Saving service review...', true);
      try {
        const res = await fetch(apiUrl('/api/service-reviews'), {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(true),
          body: JSON.stringify({ rating, comment }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Unable to save service review.');
        existingServiceReview = data.review || existingServiceReview;
        if (serviceDeleteBtn) serviceDeleteBtn.style.display = '';
        setServiceMessage('Service review saved successfully.', true);
      } catch (e) {
        setServiceMessage(e.message, false);
      } finally {
        serviceSaveBtn.disabled = false;
      }
    });
  }

  if (serviceDeleteBtn) {
    serviceDeleteBtn.addEventListener('click', async () => {
      if (!existingServiceReview || !existingServiceReview.id) return;
      if (!confirm('Delete your service review?')) return;
      serviceDeleteBtn.disabled = true;
      setServiceMessage('Deleting service review...', true);
      try {
        const res = await fetch(apiUrl(`/api/service-reviews/${existingServiceReview.id}`), {
          method: 'DELETE',
          credentials: 'include',
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Unable to delete service review.');
        existingServiceReview = null;
        serviceRatingEl.value = '5';
        serviceCommentEl.value = '';
        serviceDeleteBtn.style.display = 'none';
        setServiceMessage('Service review deleted.', true);
      } catch (e) {
        setServiceMessage(e.message, false);
      } finally {
        serviceDeleteBtn.disabled = false;
      }
    });
  }

  // GDPR actions
  const exportBtn = document.getElementById('export-data-btn');
  const deleteBtn = document.getElementById('delete-account-btn');
  const gdprStatus = document.getElementById('gdpr-status');

  function setGdprStatus(msg, isError) {
    if (!gdprStatus) return;
    gdprStatus.textContent = msg;
    gdprStatus.style.color = isError ? '#b42318' : '#1f6a2e';
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      setGdprStatus('Preparing your data export…', false);
      try {
        const res = await fetch(apiUrl('/api/gdpr?action=export'), { credentials: 'include', headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Export failed.');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'techverse-my-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setGdprStatus('Your data has been downloaded.', false);
      } catch (err) {
        setGdprStatus(err.message, true);
      } finally {
        exportBtn.disabled = false;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to request deletion of your account and all personal data? This cannot be undone.')) return;
      deleteBtn.disabled = true;
      setGdprStatus('Submitting deletion request…', false);
      try {
        const res = await fetch(apiUrl('/api/gdpr?action=request-deletion'), {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(true),
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Deletion request failed.');
        setGdprStatus('Your deletion request has been submitted. We will process it within 30 days.', false);
      } catch (err) {
        deleteBtn.disabled = false;
        setGdprStatus(err.message, true);
      }
    });
  }

  refreshListings();
  loadOrders();
  loadServiceReview();
});
