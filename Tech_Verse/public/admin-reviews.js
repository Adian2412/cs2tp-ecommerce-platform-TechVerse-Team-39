document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('reviews-auth-status');
  const adminContent = document.getElementById('reviews-admin-content');
  const productTbody = document.getElementById('reviews-table-body');
  const serviceTbody = document.getElementById('service-reviews-table-body');
  const searchInput = document.getElementById('review-search');
  function apiBase() { try { const meta = document.querySelector('meta[name="tv-api-base"]'); const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim(); return raw ? raw.replace(/\/+$/, '') : ''; } catch (e) { return ''; } }
  function getCurrentUser() { try { return JSON.parse(localStorage.getItem('techverse_auth_user') || 'null'); } catch (e) { return null; } }
  function getHeaders() { const headers = { Accept: 'application/json' }; const token = localStorage.getItem('techverse_session_token'); if (token) headers['X-Session-Token'] = token; return headers; }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function formatDate(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString(); }
  const currentUser = getCurrentUser();
  if (!currentUser) { authStatus.textContent = 'You must be signed in to access review moderation.'; authStatus.style.color = '#d00'; setTimeout(() => location.href = 'signin.html', 1200); return; }
  if (currentUser.role !== 'admin') { authStatus.textContent = 'Access denied. This page is only for admin users.'; authStatus.style.color = '#d00'; setTimeout(() => location.href = 'index.html', 1200); return; }
  let productReviews = []; let serviceReviews = [];
  function matchesTerm(parts, term) { const hay = parts.join(' ').toLowerCase(); return !term || hay.includes(term); }
  function render() {
    const term = (searchInput.value || '').trim().toLowerCase();
    const filteredProduct = productReviews.filter(review => matchesTerm(['product', review.id, review.product && review.product.name, review.user && review.user.name, review.comment, review.rating], term));
    productTbody.innerHTML = filteredProduct.length ? filteredProduct.map(review => `<tr><td>${review.id}</td><td>${escapeHtml(review.product && review.product.name ? review.product.name : 'Unknown product')}</td><td>${escapeHtml(review.user && review.user.name ? review.user.name : 'Unknown user')}</td><td><span class="rating">${'★'.repeat(Number(review.rating || 0))}</span> ${Number(review.rating || 0)}/5</td><td>${escapeHtml(review.comment || '')}</td><td>${escapeHtml(formatDate(review.created_at))}</td><td><button class="btnish delete-product-review" data-review-id="${review.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="7" class="muted">No product reviews matched your search.</td></tr>';
    const filteredService = serviceReviews.filter(review => matchesTerm(['service', review.id, review.user && review.user.name, review.comment, review.rating], term));
    serviceTbody.innerHTML = filteredService.length ? filteredService.map(review => `<tr><td>${review.id}</td><td>${escapeHtml(review.user && review.user.name ? review.user.name : 'Unknown user')}</td><td><span class="rating">${'★'.repeat(Number(review.rating || 0))}</span> ${Number(review.rating || 0)}/5</td><td>${escapeHtml(review.comment || '')}</td><td>${escapeHtml(formatDate(review.updated_at || review.created_at))}</td><td><button class="btnish delete-service-review" data-review-id="${review.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="6" class="muted">No service reviews matched your search.</td></tr>';
    document.querySelectorAll('.delete-product-review').forEach(button => button.addEventListener('click', async () => {
      const reviewId = button.getAttribute('data-review-id'); if (!confirm(`Delete product review #${reviewId}?`)) return; button.disabled = true;
      try { const response = await fetch(`${apiBase()}/api/reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(), credentials: 'include' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || payload.message || 'Unable to delete review.'); productReviews = productReviews.filter(item => String(item.id) !== String(reviewId)); render(); } catch (error) { button.disabled = false; alert(error.message); }
    }));
    document.querySelectorAll('.delete-service-review').forEach(button => button.addEventListener('click', async () => {
      const reviewId = button.getAttribute('data-review-id'); if (!confirm(`Delete service review #${reviewId}?`)) return; button.disabled = true;
      try { const response = await fetch(`${apiBase()}/api/admin/service-reviews/${reviewId}`, { method: 'DELETE', headers: getHeaders(), credentials: 'include' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || payload.message || 'Unable to delete service review.'); serviceReviews = serviceReviews.filter(item => String(item.id) !== String(reviewId)); render(); } catch (error) { button.disabled = false; alert(error.message); }
    }));
  }
  try {
    const [productResp, serviceResp] = await Promise.all([
      fetch(`${apiBase()}/api/admin/reviews`, { headers: getHeaders(), credentials: 'include' }),
      fetch(`${apiBase()}/api/admin/service-reviews`, { headers: getHeaders(), credentials: 'include' })
    ]);
    const productPayload = await productResp.json(); const servicePayload = await serviceResp.json();
    if (!productResp.ok) throw new Error(productPayload.error || 'Unable to load product reviews.');
    if (!serviceResp.ok) throw new Error(servicePayload.error || 'Unable to load service reviews.');
    productReviews = Array.isArray(productPayload.reviews) ? productPayload.reviews : [];
    serviceReviews = Array.isArray(servicePayload.reviews) ? servicePayload.reviews : [];
    authStatus.style.display = 'none'; adminContent.style.display = 'block'; render();
  } catch (error) { authStatus.textContent = error.message; authStatus.style.color = '#d00'; return; }
  searchInput.addEventListener('input', render);
});
