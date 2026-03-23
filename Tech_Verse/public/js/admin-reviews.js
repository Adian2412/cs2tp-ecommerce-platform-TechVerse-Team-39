document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('reviews-auth-status');
  const adminContent = document.getElementById('reviews-admin-content');
  const productTbody = document.getElementById('reviews-table-body');
  const serviceTbody = document.getElementById('service-reviews-table-body');
  const searchInput = document.getElementById('review-search');

  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) { return ''; }
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function getHeaders() {
    const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() };
    const token = localStorage.getItem('techverse_session_token');
    if (token) headers['X-Session-Token'] = token;
    return headers;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  // Verify admin via server session
  let currentUser = null;
  try {
    const meRes = await fetch('/api/auth/me', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) currentUser = meData.user;
    }
  } catch (e) {}

  if (!currentUser) {
    authStatus.textContent = 'You must be signed in to access review moderation.';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'signin.html', 1200);
    return;
  }
  if (currentUser.role !== 'admin') {
    authStatus.textContent = 'Access denied. This page is only for admin users.';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'index.html', 1200);
    return;
  }

  let productReviews = [];
  let serviceReviews = [];

  function matchesTerm(parts, term) {
    const hay = parts.join(' ').toLowerCase();
    return !term || hay.includes(term);
  }

  function render() {
    const term = (searchInput.value || '').trim().toLowerCase();

    const filteredProduct = productReviews.filter(r =>
      matchesTerm(['product', r.id, r.product && r.product.name, r.user && r.user.name, r.comment, r.rating], term));
    productTbody.innerHTML = filteredProduct.length
      ? filteredProduct.map(r => `<tr>
          <td>${r.id}</td>
          <td>${escapeHtml(r.product && r.product.name ? r.product.name : 'Unknown product')}</td>
          <td>${escapeHtml(r.user && r.user.name ? r.user.name : 'Unknown user')}</td>
          <td><span class="rating">${'★'.repeat(Number(r.rating||0))}</span> ${Number(r.rating||0)}/5</td>
          <td>${escapeHtml(r.comment||'')}</td>
          <td>${escapeHtml(formatDate(r.created_at))}</td>
          <td><button class="btnish delete-product-review" data-review-id="${r.id}">Delete</button></td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="muted">No product reviews matched your search.</td></tr>';

    const filteredService = serviceReviews.filter(r =>
      matchesTerm(['service', r.id, r.user && r.user.name, r.comment, r.rating], term));
    serviceTbody.innerHTML = filteredService.length
      ? filteredService.map(r => `<tr>
          <td>${r.id}</td>
          <td>${escapeHtml(r.user && r.user.name ? r.user.name : 'Unknown user')}</td>
          <td><span class="rating">${'★'.repeat(Number(r.rating||0))}</span> ${Number(r.rating||0)}/5</td>
          <td>${escapeHtml(r.comment||'')}</td>
          <td>${escapeHtml(formatDate(r.updated_at||r.created_at))}</td>
          <td><button class="btnish delete-service-review" data-review-id="${r.id}">Delete</button></td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="muted">No service reviews matched your search.</td></tr>';

    document.querySelectorAll('.delete-product-review').forEach(button => button.addEventListener('click', async () => {
      const reviewId = button.getAttribute('data-review-id');
      if (!confirm(`Delete product review #${reviewId}?`)) return;
      button.disabled = true;
      try {
        const response = await fetch(`${apiBase()}/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(), credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || payload.message || 'Unable to delete review.');
        productReviews = productReviews.filter(item => String(item.id) !== String(reviewId));
        render();
      } catch (error) { button.disabled = false; alert(error.message); }
    }));

    document.querySelectorAll('.delete-service-review').forEach(button => button.addEventListener('click', async () => {
      const reviewId = button.getAttribute('data-review-id');
      if (!confirm(`Delete service review #${reviewId}?`)) return;
      button.disabled = true;
      try {
        const response = await fetch(`${apiBase()}/api/admin/service-reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(), credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || payload.message || 'Unable to delete service review.');
        serviceReviews = serviceReviews.filter(item => String(item.id) !== String(reviewId));
        render();
      } catch (error) { button.disabled = false; alert(error.message); }
    }));
  }

  try {
    const [productResp, serviceResp] = await Promise.all([
      fetch(`${apiBase()}/api/admin/reviews`, { headers: getHeaders(), credentials: 'include' }),
      fetch(`${apiBase()}/api/admin/service-reviews`, { headers: getHeaders(), credentials: 'include' })
    ]);
    const productPayload = await productResp.json();
    const servicePayload = await serviceResp.json();
    if (!productResp.ok) throw new Error(productPayload.error || 'Unable to load product reviews.');
    if (!serviceResp.ok) throw new Error(servicePayload.error || 'Unable to load service reviews.');
    productReviews = Array.isArray(productPayload.reviews) ? productPayload.reviews : [];
    serviceReviews = Array.isArray(servicePayload.reviews) ? servicePayload.reviews : [];
    authStatus.style.display = 'none';
    adminContent.style.display = 'block';
    render();
  } catch (error) {
    authStatus.textContent = error.message;
    authStatus.style.color = '#d00';
    return;
  }

  searchInput.addEventListener('input', render);
});
