document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('returns-auth-status');
  const content = document.getElementById('returns-admin-content');
  const tbody = document.getElementById('returns-table-body');
  const filter = document.getElementById('return-filter');

  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) {
      return '';
    }
  }
catch (e) { return null; }
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }
    function getHeaders() {
    const headers = { Accept: 'application/json', 'X-CSRF-TOKEN': getCsrfToken(), 'Content-Type': 'application/json' };
    const token = localStorage.getItem('techverse_session_token');
    if (token) headers['X-Session-Token'] = token;
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
  if (!currentUser) { authStatus.textContent = 'You must be signed in to access admin product tools. Redirecting...'; authStatus.style.color = '#d00'; setTimeout(() => location.href = 'signin.html', 1200); return; }
  if (currentUser.role !== 'admin') { authStatus.textContent = 'Access denied. This page is only for admin users.'; authStatus.style.color = '#d00'; setTimeout(() => location.href = 'index.html', 1500); return; }

  let allReturns = [];

  function renderRows() {
    const activeFilter = filter ? filter.value : 'all';
    const list = allReturns.filter(item => activeFilter === 'all' ? true : String(item.status) === activeFilter);

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted">No returns match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(item => {
      const order = item.order_item && item.order_item.order ? item.order_item.order : null;
      const user = order && order.user ? order.user : null;
      const product = item.order_item && item.order_item.variant && item.order_item.variant.product ? item.order_item.variant.product : null;
      const options = ['requested', 'approved', 'rejected', 'refunded']
        .map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`)
        .join('');
      return `
        <tr>
          <td>#${item.id}</td>
          <td>#${order ? order.id : '-'}</td>
          <td>${escapeHtml(user ? user.name : 'Unknown')}</td>
          <td>${escapeHtml(product ? product.name : 'Unknown')}</td>
          <td>${escapeHtml(item.reason || '')}</td>
          <td><span class="status-pill status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>
            <select data-return-id="${item.id}">${options}</select>
            <button class="btnish save-return" data-return-id="${item.id}">Save</button>
          </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.save-return').forEach(button => {
      button.addEventListener('click', async () => {
        const returnId = button.getAttribute('data-return-id');
        const select = document.querySelector(`select[data-return-id="${returnId}"]`);
        const status = select ? select.value : 'requested';
        button.disabled = true;
        try {
          const response = await fetch(`${apiBase()}/api/admin/returns/${returnId}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ status }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Unable to update the return request.');
          alert(`Return #${returnId} updated to ${status}.`);
          await loadReturns();
        } catch (error) {
          button.disabled = false;
          alert(error.message);
        }
      });
    });
  }

  async function loadReturns() {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Loading returns...</td></tr>';
    const response = await fetch(`${apiBase()}/api/admin/returns`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load return requests.');
    allReturns = Array.isArray(data.returns) ? data.returns : [];
    renderRows();
  }

  try {
    authStatus.style.display = 'none';
    content.style.display = 'block';
    if (filter) filter.addEventListener('change', renderRows);
    await loadReturns();
  } catch (error) {
    authStatus.style.display = 'block';
    authStatus.textContent = error.message;
    authStatus.style.color = '#d00';
    content.style.display = 'none';
  }
});
