document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('returns-status');
  const itemsWrap = document.getElementById('returns-items');

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

  function getHeaders(withJson = false) {
    const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken() };
    const token = localStorage.getItem('techverse_session_token');
    if (token) headers['X-Session-Token'] = token;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function money(value) { return '£' + Number(value || 0).toFixed(2); }

  // Verify user via server session
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
    alert('Please sign in to request a return.');
    location.href = 'signin.html';
    return;
  }

  const params = new URLSearchParams(location.search);
  const orderId = params.get('order');
  if (!orderId) {
    statusEl.textContent = 'No order was selected for the return request.';
    return;
  }

  try {
    const response = await fetch(`${apiBase()}/api/my-orders`, {
      headers: getHeaders(), credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load your orders.');

    const order = (Array.isArray(data.orders) ? data.orders : []).find(item => String(item.id) === String(orderId));
    if (!order) throw new Error('That order could not be found in your account.');

    statusEl.textContent = `Order #${order.id} · Status: ${order.status}`;

    if (!['paid', 'shipped'].includes(String(order.status || '').toLowerCase())) {
      itemsWrap.innerHTML = '<p class="muted">This order is not currently eligible for returns. Returns can be requested once the order is paid or shipped.</p>';
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      itemsWrap.innerHTML = '<p class="muted">No order items were found for this order.</p>';
      return;
    }

    itemsWrap.innerHTML = '';
    items.forEach(item => {
      const product = item.variant && item.variant.product ? item.variant.product : null;
      const image = product && product.image_url ? product.image_url : 'images/placeholder.png';
      const existingReturn = Array.isArray(item.returns) && item.returns.length ? item.returns[0] : null;
      const card = document.createElement('article');
      card.className = 'return-item';

      card.innerHTML = `
        <img src="${image}" alt="${escapeHtml(product && product.name ? product.name : 'Product')}" onerror="this.src='images/placeholder.png'">
        <div>
          <h3 style="margin:0 0 8px;">${escapeHtml(product && product.name ? product.name : 'Product')}</h3>
          <div class="muted">Quantity: ${Number(item.quantity || 0)} · Unit price: ${money(item.unit_price || 0)}</div>
          ${existingReturn ? `<div style="margin-top:10px;"><span class="return-status ${escapeHtml(existingReturn.status)}">${escapeHtml(existingReturn.status)}</span> ${existingReturn.reason ? '· ' + escapeHtml(existingReturn.reason) : ''}</div>` : ''}
        </div>`;

      if (!existingReturn) {
        const reason = document.createElement('textarea');
        reason.placeholder = 'Reason for return';

        const actions = document.createElement('div');
        actions.className = 'actions';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn-primary';
        submitBtn.type = 'button';
        submitBtn.textContent = 'Submit return request';
        submitBtn.addEventListener('click', async () => {
          const reasonValue = reason.value.trim();
          if (!reasonValue) { alert('Please add a reason for the return request.'); return; }
          submitBtn.disabled = true;
          try {
            const submitResponse = await fetch(`${apiBase()}/api/order-items/${item.id}/return`, {
              method: 'POST', headers: getHeaders(true), credentials: 'include',
              body: JSON.stringify({ reason: reasonValue }),
            });
            const payload = await submitResponse.json();
            if (!submitResponse.ok) throw new Error(payload.error || 'Unable to submit the return request.');
            alert('Return request submitted successfully.');
            location.reload();
          } catch (error) { submitBtn.disabled = false; alert(error.message); }
        });

        actions.appendChild(submitBtn);
        const content = card.querySelector('div');
        content.appendChild(reason);
        content.appendChild(actions);
      }

      itemsWrap.appendChild(card);
    });
  } catch (error) {
    statusEl.textContent = error.message;
    itemsWrap.innerHTML = '';
  }
});
