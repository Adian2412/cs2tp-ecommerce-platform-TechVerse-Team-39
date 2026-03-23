document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('auth-status');
  const adminContent = document.getElementById('admin-content');

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
    const h = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() };
    const token = localStorage.getItem('techverse_session_token');
    if (token) h['X-Session-Token'] = token;
    return h;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(value) { return '£' + Number(value || 0).toFixed(2); }

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString();
  }

  function showBanner(message, type = 'warning') {
    const banner = document.getElementById('admin-alert-banner');
    if (!banner) return;
    banner.className = `admin-alert admin-alert-${type}`;
    banner.innerHTML = message;
    banner.style.display = 'block';
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
    authStatus.textContent = 'You must be signed in to access the admin dashboard. Redirecting...';
    authStatus.style.color = '#d00';
    setTimeout(() => { location.href = 'signin.html'; }, 1200);
    return;
  }

  if (currentUser.role !== 'admin') {
    authStatus.textContent = 'Access denied. This page is only for admin users.';
    authStatus.style.color = '#d00';
    setTimeout(() => { location.href = 'index.html'; }, 1500);
    return;
  }

  try {
    const response = await fetch(`${apiBase()}/api/admin/summary`, {
      method: 'GET', headers: getHeaders(), credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load admin dashboard.');

    authStatus.style.display = 'none';
    adminContent.style.display = 'block';

    const statsGrid = document.getElementById('stats-grid');
    const stats = data.stats || {};
    const lowStockCount = Number(stats.low_stock_items || 0);
    const pendingReturns = Number(stats.pending_returns || 0);

    if (pendingReturns > 0) {
      showBanner(`<strong>Return requests waiting:</strong> ${pendingReturns} item${pendingReturns === 1 ? '' : 's'} currently need admin review. Open <strong>Returns</strong> to process them.`, 'warning');
    } else if (lowStockCount > 0) {
      showBanner(`<strong>Low stock warning:</strong> ${lowStockCount} product${lowStockCount === 1 ? '' : 's'} ${lowStockCount === 1 ? 'is' : 'are'} at or below the configured stock threshold.`, 'warning');
    } else {
      showBanner('Orders, returns and stock levels look clear right now.', 'success');
    }

    const statCards = [
      ['Users', stats.users || 0], ['Customers', stats.customers || 0],
      ['Admins', stats.admins || 0], ['Products', stats.products || 0],
      ['Orders', stats.orders || 0], ['Pending Orders', stats.pending_orders || 0],
      ['Pending Returns', pendingReturns], ['Low Stock Items', lowStockCount],
    ];

    statsGrid.innerHTML = statCards.map(([label, value]) => {
      const alertCard = (label === 'Low Stock Items' || label === 'Pending Returns') && Number(value) > 0;
      return `<div class="stat-card${alertCard ? ' stat-card-danger' : ''}"><h3>${escapeHtml(label)}</h3><div class="stat-big">${escapeHtml(value)}</div></div>`;
    }).join('');

    const recentOrdersEl = document.getElementById('recent-orders');
    const orders = Array.isArray(data.recent_orders) ? data.recent_orders : [];

    if (!orders.length) {
      recentOrdersEl.innerHTML = '<p class="muted">No orders have been placed yet.</p>';
    } else {
      recentOrdersEl.innerHTML = `<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Placed</th><th>Update</th></tr></thead><tbody>${
        orders.map(order => {
          const statusOptions = ['pending','paid','shipped','delivered','returned','cancelled']
            .map(s => `<option value="${s}" ${order.status===s?'selected':''}>${s==='pending'?'processing':s}</option>`).join('');
          return `<tr><td>#${order.id}</td><td>${escapeHtml(order.user?order.user.name:'Unknown')}</td><td>${money(order.total)}</td><td><span class="status-pill status-${escapeHtml(order.status)}">${escapeHtml(order.status==='pending'?'processing':order.status)}</span></td><td>${formatDate(order.created_at)}</td><td><select data-order-id="${order.id}" class="order-status-select">${statusOptions}</select><button class="btn-ghost save-status" data-order-id="${order.id}">Save</button></td></tr>`;
        }).join('')
      }</tbody></table>`;
    }

    const lowStockEl = document.getElementById('low-stock');
    const lowStock = Array.isArray(data.low_stock) ? data.low_stock : [];

    if (!lowStock.length) {
      lowStockEl.innerHTML = '<p class="muted">No products are currently at or below the low-stock threshold.</p>';
    } else {
      lowStockEl.innerHTML = `<table><thead><tr><th>Product</th><th>Quantity</th><th>Threshold</th><th>State</th></tr></thead><tbody>${
        lowStock.map(item => {
          const qty = Number(item.quantity||0), thr = Number(item.low_stock_threshold||0);
          const state = qty<=0?'Out of stock':(qty<=thr?'Low stock':'In stock');
          const rowClass = qty<=0?'row-critical':'row-warning';
          return `<tr class="${rowClass}"><td>${escapeHtml(item.variant&&item.variant.product?item.variant.product.name:'Unknown product')}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.low_stock_threshold)}</td><td>${escapeHtml(state)}</td></tr>`;
        }).join('')
      }</tbody></table>`;
    }

    const usersEl = document.getElementById('recent-users');
    const users = Array.isArray(data.recent_users) ? data.recent_users : [];

    if (!users.length) {
      usersEl.innerHTML = '<p class="muted">No users found.</p>';
    } else {
      usersEl.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead><tbody>${
        users.map(u => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${formatDate(u.created_at)}</td></tr>`).join('')
      }</tbody></table>`;
    }

    document.querySelectorAll('.save-status').forEach(button => {
      button.addEventListener('click', async () => {
        const orderId = button.getAttribute('data-order-id');
        const select = document.querySelector(`.order-status-select[data-order-id="${orderId}"]`);
        const status = select ? select.value : 'pending';
        button.disabled = true;
        try {
          const res = await fetch(`${apiBase()}/api/orders/${orderId}`, {
            method: 'PUT', headers: getHeaders(), credentials: 'include',
            body: JSON.stringify({ status }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || 'Unable to update order status.');
          alert(`Order #${orderId} updated to ${status}.`);
          location.reload();
        } catch (error) { button.disabled = false; alert(error.message); }
      });
    });

  } catch (error) {
    authStatus.textContent = error.message;
    authStatus.style.color = '#d00';
  }
});
