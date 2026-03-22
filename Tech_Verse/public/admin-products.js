document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('auth-status');
  const adminContent = document.getElementById('admin-content');
  const form = document.getElementById('product-form');
  const tableBody = document.getElementById('products-table-body');
  const categorySelect = document.getElementById('category_id');
  const searchInput = document.getElementById('product-search');
  const notice = document.getElementById('notice');
  const formTitle = document.getElementById('form-title');

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

  function getHeaders() {
    const headers = { Accept: 'application/json' };
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

  function money(value) {
    return '£' + Number(value || 0).toFixed(2);
  }

  function showNotice(message, type = 'success') {
    notice.className = `notice ${type}`;
    notice.textContent = message;
    notice.style.display = 'block';
  }

  function clearNotice() {
    notice.style.display = 'none';
    notice.textContent = '';
  }

  function stateBadge(product) {
    if (!product.active) return '<span class="badge badge-off">Inactive</span>';
    if (Number(product.stock) <= 0) return '<span class="badge badge-out">Out of stock</span>';
    if (Number(product.stock) <= Number(product.low_stock_threshold || 0)) return '<span class="badge badge-low">Low stock</span>';
    return '<span class="badge badge-ok">In stock</span>';
  }

  function resetForm() {
    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('active').checked = true;
    document.getElementById('low_stock_threshold').value = 5;
    document.getElementById('variant_label').value = 'Default';
    document.getElementById('image_file').value = '';
    formTitle.textContent = 'Add product';
  }

  function fillForm(product) {
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name || '';
    document.getElementById('brand').value = product.brand || '';
    document.getElementById('category_id').value = product.category_id || '';
    document.getElementById('new_category_name').value = '';
    document.getElementById('price').value = Number(product.price || 0).toFixed(2);
    document.getElementById('stock').value = Number(product.stock || 0);
    document.getElementById('low_stock_threshold').value = Number(product.low_stock_threshold || 5);
    document.getElementById('variant_label').value = product.variant_label || 'Default';
    document.getElementById('sku').value = product.sku || '';
    document.getElementById('image_url').value = product.image_url || '';
    document.getElementById('description').value = product.description || '';
    document.getElementById('image_file').value = '';
    document.getElementById('active').checked = !!product.active;
    formTitle.textContent = `Edit product #${product.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadCategories() {
    const response = await fetch(`${apiBase()}/api/admin/categories`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load categories');

    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    categorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }

  function renderProducts(products) {
    if (!products.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="muted">No products matched this search.</td></tr>';
      return;
    }

    tableBody.innerHTML = products.map(product => `
      <tr>
        <td>#${product.id}</td>
        <td>
          <strong>${escapeHtml(product.name)}</strong><br>
          <span class="muted">${escapeHtml(product.brand || 'No brand')} · SKU ${escapeHtml(product.sku || '—')}</span>
        </td>
        <td>${escapeHtml(product.category_name || 'Uncategorised')}</td>
        <td>${money(product.price)}</td>
        <td>
          <strong>${escapeHtml(product.stock)}</strong><br>
          <span class="muted">Threshold ${escapeHtml(product.low_stock_threshold)}</span>
        </td>
        <td>${stateBadge(product)}</td>
        <td>
          <div class="inline-actions" style="margin-bottom:8px;">
            <button class="btnish secondary edit-product" data-id="${product.id}" type="button">Edit</button>
            <button class="btnish secondary toggle-active" data-id="${product.id}" type="button">${product.active ? 'Deactivate' : 'Activate'}</button>
            <button class="btnish danger delete-product" data-id="${product.id}" type="button">Delete</button>
          </div>
          <div class="stock-adjust">
            <input class="stock-delta" data-id="${product.id}" type="number" step="1" placeholder="+/- qty">
            <button class="btnish secondary adjust-stock" data-id="${product.id}" type="button">Adjust stock</button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = window.__adminProducts.find(item => Number(item.id) === Number(btn.dataset.id));
        if (product) fillForm(product);
      });
    });

    tableBody.querySelectorAll('.toggle-active').forEach(btn => {
      btn.addEventListener('click', async () => {
        clearNotice();
        try {
          const response = await fetch(`${apiBase()}/api/admin/products/${btn.dataset.id}/toggle-active`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Unable to change active state');
          showNotice(payload.message || 'Product state updated.');
          await loadProducts(searchInput.value.trim());
        } catch (error) {
          showNotice(error.message, 'error');
        }
      });
    });

    tableBody.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        clearNotice();
        const product = window.__adminProducts.find(item => Number(item.id) === Number(btn.dataset.id));
        if (!product) return;
        if (!confirm(`Delete ${product.name}? This only works for products without any order history.`)) return;
        try {
          const response = await fetch(`${apiBase()}/api/admin/products/${btn.dataset.id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include',
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Unable to delete product');
          showNotice(payload.message || 'Product deleted.');
          resetForm();
          await loadProducts(searchInput.value.trim());
        } catch (error) {
          showNotice(error.message, 'error');
        }
      });
    });

    tableBody.querySelectorAll('.adjust-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        clearNotice();
        const input = document.querySelector(`.stock-delta[data-id="${btn.dataset.id}"]`);
        const delta = Number(input && input.value);
        if (!Number.isInteger(delta) || delta === 0) {
          showNotice('Enter a whole positive or negative quantity for the stock adjustment.', 'error');
          return;
        }
        try {
          const response = await fetch(`${apiBase()}/api/admin/products/${btn.dataset.id}/adjust-stock`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ delta, note: 'Admin inventory adjustment' }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Unable to adjust stock');
          showNotice(payload.message || 'Stock adjusted successfully.');
          if (input) input.value = '';
          await loadProducts(searchInput.value.trim());
        } catch (error) {
          showNotice(error.message, 'error');
        }
      });
    });
  }

  async function loadProducts(query = '') {
    const url = new URL(`${apiBase()}/api/admin/products`);
    if (query) url.searchParams.set('q', query);
    const response = await fetch(url.toString(), {
      headers: getHeaders(),
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load products');
    window.__adminProducts = Array.isArray(payload.products) ? payload.products : [];
    renderProducts(window.__adminProducts);
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    authStatus.textContent = 'You must be signed in to access admin product tools. Redirecting...';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'signin.html', 1200);
    return;
  }

  if (currentUser.role !== 'admin') {
    authStatus.textContent = 'Access denied. This page is only for admin users.';
    authStatus.style.color = '#d00';
    setTimeout(() => location.href = 'index.html', 1500);
    return;
  }

  try {
    await loadCategories();
    await loadProducts();
    authStatus.style.display = 'none';
    adminContent.style.display = 'block';
  } catch (error) {
    authStatus.textContent = error.message;
    authStatus.style.color = '#d00';
  }

  document.getElementById('new-product-btn').addEventListener('click', () => {
    clearNotice();
    resetForm();
  });

  document.getElementById('refresh-products').addEventListener('click', async () => {
    clearNotice();
    try {
      await loadProducts(searchInput.value.trim());
      showNotice('Product list refreshed.');
    } catch (error) {
      showNotice(error.message, 'error');
    }
  });

  document.getElementById('reset-form').addEventListener('click', () => {
    clearNotice();
    resetForm();
  });

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        await loadProducts(searchInput.value.trim());
      } catch (error) {
        showNotice(error.message, 'error');
      }
    }, 220);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearNotice();

    const productId = document.getElementById('product-id').value.trim();
    const imageFile = document.getElementById('image_file').files[0] || null;

    const formData = new FormData();
    formData.append('name', document.getElementById('name').value.trim());
    formData.append('brand', document.getElementById('brand').value.trim());
    formData.append('category_id', String(Number(document.getElementById('category_id').value || 0)));
    formData.append('new_category_name', document.getElementById('new_category_name').value.trim());
    formData.append('price', String(Number(document.getElementById('price').value || 0)));
    formData.append('stock', String(Number(document.getElementById('stock').value || 0)));
    formData.append('low_stock_threshold', String(Number(document.getElementById('low_stock_threshold').value || 0)));
    formData.append('variant_label', document.getElementById('variant_label').value.trim() || 'Default');
    formData.append('sku', document.getElementById('sku').value.trim());
    formData.append('image_url', document.getElementById('image_url').value.trim());
    formData.append('description', document.getElementById('description').value.trim());
    formData.append('active', document.getElementById('active').checked ? '1' : '0');
    if (imageFile) formData.append('image_file', imageFile);

    if (!document.getElementById('name').value.trim()) {
      showNotice('Product name is required.', 'error');
      return;
    }

    const method = productId ? 'POST' : 'POST';
    const endpoint = productId ? `${apiBase()}/api/admin/products/${productId}` : `${apiBase()}/api/admin/products`;
    if (productId) formData.append('_method', 'PUT');

    try {
      const headers = { Accept: 'application/json' };
      const token = localStorage.getItem('techverse_session_token');
      if (token) headers['X-Session-Token'] = token;

      const response = await fetch(endpoint, {
        method,
        headers,
        credentials: 'include',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        const firstValidation = result.errors ? Object.values(result.errors)[0]?.[0] : null;
        throw new Error(firstValidation || result.error || 'Unable to save product');
      }
      showNotice(result.message || 'Product saved successfully.');
      resetForm();
      await loadCategories();
      await loadProducts(searchInput.value.trim());
    } catch (error) {
      showNotice(error.message, 'error');
    }
  });

  resetForm();
});
