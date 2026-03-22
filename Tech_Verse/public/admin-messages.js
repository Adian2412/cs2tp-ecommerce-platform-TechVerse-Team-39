document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('messages-auth-status');
  const content = document.getElementById('messages-admin-content');
  const tableBody = document.getElementById('messages-table-body');
  const searchInput = document.getElementById('message-search');

  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) {
      return '';
    }
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('techverse_auth_user') || 'null'); } catch (e) { return null; }
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

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleString();
  }

  const user = getCurrentUser();
  if (!user) {
    authStatus.textContent = 'You must be signed in to access admin messages. Redirecting...';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'signin.html', 1200);
    return;
  }

  if (user.role !== 'admin') {
    authStatus.textContent = 'Access denied. This page is only for admin users.';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'index.html', 1500);
    return;
  }

  let allMessages = [];

  function renderRows(list) {
    if (!list.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="muted">No contact messages found.</td></tr>';
      return;
    }

    tableBody.innerHTML = list.map(msg => `
      <tr>
        <td>
          <strong>${escapeHtml(msg.name)}</strong><br>
          <span class="muted">${escapeHtml(msg.email)}</span>
        </td>
        <td>
          <div class="msg-subject">${escapeHtml(msg.subject)}</div>
          <div class="msg-body">${escapeHtml(msg.message)}</div>
        </td>
        <td>${formatDate(msg.created_at)}</td>
        <td>
          <button class="btnish danger delete-message" data-id="${msg.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.delete-message').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this contact message?')) return;
        btn.disabled = true;
        try {
          const response = await fetch(`${apiBase()}/api/admin/contact-messages/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include',
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Unable to delete message.');
          allMessages = allMessages.filter(item => String(item.id) !== String(id));
          applyFilter();
        } catch (error) {
          btn.disabled = false;
          alert(error.message);
        }
      });
    });
  }

  function applyFilter() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    if (!q) {
      renderRows(allMessages);
      return;
    }

    const filtered = allMessages.filter(msg => {
      return [msg.name, msg.email, msg.subject, msg.message]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    renderRows(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
  }

  try {
    const response = await fetch(`${apiBase()}/api/admin/contact-messages`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load contact messages.');

    allMessages = Array.isArray(data.messages) ? data.messages : [];
    authStatus.style.display = 'none';
    content.style.display = 'block';
    applyFilter();
  } catch (error) {
    authStatus.textContent = error.message;
    authStatus.style.color = '#d00';
  }
});
