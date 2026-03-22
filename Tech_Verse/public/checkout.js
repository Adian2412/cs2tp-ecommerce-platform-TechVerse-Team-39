(function () {
  const CART_KEY = 'techverse_cart_v1';
  const AUTH_KEY = 'techverse_auth_user';
  const TOKEN_KEY = 'techverse_session_token';

  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      if (raw) return raw.replace(/\/+$/, '');
    } catch (e) {}
    return '';
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; }
  }

  function getHeaders(withJson = false) {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['X-Session-Token'] = token;
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch (e) { return {}; }
  }

  function formatMoney(value) {
    const fmt = window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function'
      ? window.tvCurrency.formatCurrency
      : v => (Number.isFinite(Number(v)) ? '£' + Number(v).toFixed(2) : String(v));
    return fmt(Number(value || 0));
  }

  function formatItem(it) {
    const qty = Number(it.qty || 0);
    const price = parseFloat(String(it.price || '0').replace(/[^0-9.]/g, '')) || 0;
    return `
      <div style="padding:8px;border:1px solid #eee;margin-bottom:8px;border-radius:6px">
        <div style="font-weight:600">${it.name || ('Product ' + it.id)}</div>
        <div>Qty: ${qty}</div>
        <div>Price: ${formatMoney(price)}</div>
      </div>`;
  }

  const user = getUser();
  if (!user) {
    alert('Please sign in before checking out.');
    window.location.href = 'signin.html';
    return;
  }

  const items = loadCart();
  const keys = Object.keys(items);
  const container = document.getElementById('checkout-items');
  if (!container) return;

  let subtotal = 0;
  if (!keys.length) {
    container.innerHTML = '<p class="muted">Your cart is empty.</p>';
  } else {
    container.innerHTML = keys.map(k => formatItem(items[k])).join('');
    subtotal = keys.reduce((sum, key) => {
      const price = parseFloat(String(items[key].price || '0').replace(/[^0-9.]/g, '')) || 0;
      return sum + price * (Number(items[key].qty || 0));
    }, 0);
  }

  const shippingInputs = Array.from(document.querySelectorAll('input[name="shipping"]'));
  function selectedShippingCost() {
    const selected = shippingInputs.find(i => i.checked);
    return selected ? parseFloat(selected.dataset.cost || '0') : 0;
  }

  function refreshSummary() {
    const shipping = selectedShippingCost();
    const total = subtotal + shipping;
    const subEl = document.getElementById('summary-subtotal');
    const shipEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');
    if (subEl) subEl.textContent = `Subtotal: ${formatMoney(subtotal)}`;
    if (shipEl) shipEl.textContent = `Shipping: ${formatMoney(shipping)}`;
    if (totalEl) totalEl.textContent = `Total: ${formatMoney(total)}`;

    shippingInputs.forEach(input => {
      const span = input.parentElement && input.parentElement.querySelector('.shipping-cost');
      if (span) span.textContent = formatMoney(input.dataset.cost || 0);
    });
  }

  shippingInputs.forEach(input => input.addEventListener('change', refreshSummary));
  window.addEventListener && window.addEventListener('tvCurrencyRatesReady', refreshSummary);
  refreshSummary();

  document.getElementById('place-order').addEventListener('click', async function () {
    if (!keys.length) {
      alert('Your cart is empty.');
      return;
    }

    const line1 = (document.getElementById('address-line1') || {}).value || '';
    const line2 = (document.getElementById('address-line2') || {}).value || '';
    const city = (document.getElementById('county') || {}).value || '';
    const postcode = (document.getElementById('postal-code') || {}).value || '';
    const country = (document.getElementById('country-select') || {}).value || '';

    const cardName = (document.getElementById('card-name') || {}).value || '';
    const cardNumber = (document.getElementById('card-number') || {}).value || '';
    const expiry = (document.getElementById('card-expiry') || {}).value || '';
    const cvv = (document.getElementById('card-cvv') || {}).value || '';

    if (!line1 || !postcode || !country) {
      alert('Please complete the delivery address before placing the order.');
      return;
    }

    if (!cardName || !cardNumber || !expiry || !cvv) {
      alert('Please complete the dummy payment fields before placing the order.');
      return;
    }

    const payload = {
      cart_items: keys.map(key => ({
        product_id: Number(items[key].id),
        quantity: Number(items[key].qty || 0),
      })),
      shipping_cost: selectedShippingCost(),
      address: { line1, line2, city, postcode, country },
    };

    const resultEl = document.getElementById('order-result');
    const button = document.getElementById('place-order');
    button.disabled = true;
    button.classList.add('btn-disabled');
    if (resultEl) {
      resultEl.style.color = '#444';
      resultEl.textContent = 'Placing your order...';
    }

    try {
      const response = await fetch(`${apiBase()}/api/checkout`, {
        method: 'POST',
        headers: getHeaders(true),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }

      localStorage.removeItem(CART_KEY);
      if (window.refreshCartBadge) window.refreshCartBadge();

      if (resultEl) {
        resultEl.style.color = 'green';
        resultEl.textContent = `Order #${data.order.id} placed successfully. Redirecting to your account...`;
      }

      setTimeout(() => {
        window.location.href = 'account.html';
      }, 1200);
    } catch (error) {
      button.disabled = false;
      button.classList.remove('btn-disabled');
      if (resultEl) {
        resultEl.style.color = '#d00';
        resultEl.textContent = error.message;
      } else {
        alert(error.message);
      }
    }
  });
})();
