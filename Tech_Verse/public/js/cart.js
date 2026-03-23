(function () {
    const CART_KEY = 'techverse_cart_v1';

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    // ── LocalStorage helpers (kept as fallback) ───────────────────────────────
    function loadCartLocal()  { try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch (e) { return {}; } }
    function saveCartLocal(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c || {})); } catch (e) {} }

    // ── Server helpers ────────────────────────────────────────────────────────
    let serverAvailable = false;

    async function fetchCartFromServer() {
        const res = await fetch('/api/cart', { credentials: 'include' });
        if (!res.ok) throw new Error('not ok');
        return res.json();
    }

    async function postCartToServer(variantId, quantity) {
        const res = await fetch('/api/cart', {
            method:      'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
            body: JSON.stringify({ variant_id: variantId, quantity }),
        });
        if (!res.ok) throw new Error('post failed');
        return res.json();
    }

    // Normalise server cart response into the local { [id]: {id, qty, name, price} } shape
    function normaliseServerCart(data) {
        const cart = {};
        const items = data.items || data.data || (Array.isArray(data) ? data : []);
        items.forEach(item => {
            const variant = item.variant || {};
            const product = variant.product || {};
            const id      = String(item.variant_id || item.id);
            cart[id] = {
                id:    id,
                qty:   item.quantity || 1,
                name:  product.name  || variant.name || id,
                price: parseFloat(item.unit_price || variant.price || product.price || 0),
                image: product.image_url || null,
                stock: variant.stock_qty || null,
            };
        });
        return cart;
    }

    // ── Formatting ────────────────────────────────────────────────────────────
    function fmt(v) {
        if (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') return window.tvCurrency.formatCurrency(v);
        return '£' + Number(v).toFixed(2);
    }

    function formatRow(item) {
        const image    = item.image || 'images/placeholder.png';
        const name     = item.name  || item.id;
        const qty      = Number(item.qty || 0);
        const unitNum  = parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || null;
        const totalNum = unitNum !== null ? unitNum * qty : null;
        const available = item.stock !== undefined && item.stock !== null ? item.stock : null;
        return `
        <div class="cart-row">
            <img src="${image}" alt="${name}">
            <div class="meta">
                <div class="title">${name}</div>
                <div class="meta-sub">Available: ${available !== null ? available : '—'}</div>
                <div class="meta-sub">Unit price: ${unitNum !== null ? fmt(unitNum) : 'N/A'}</div>
            </div>
            <div class="price">${totalNum !== null ? fmt(totalNum) : 'N/A'}</div>
            <div class="actions">
                <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
                    <button class="btn-ghost" onclick="decreaseQty('${item.id}')">−</button>
                    <div style="min-width:34px;text-align:center;font-weight:600">${qty}</div>
                    <button class="btn-ghost" onclick="increaseQty('${item.id}')">+</button>
                    <button class="btn-remove" style="margin-left:12px" onclick="removeFromCart('${item.id}')">Remove</button>
                </div>
            </div>
        </div>`;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function renderCart(cart) {
        const container  = document.getElementById('cart-items');
        const summaryEl  = document.getElementById('cart-summary');
        const toCheckout = document.getElementById('to-checkout');
        if (!container) return;

        const keys = Object.keys(cart);
        if (!keys.length) {
            container.innerHTML = '<p class="muted">Your cart is empty.</p>';
            if (summaryEl) summaryEl.innerHTML = '';
        } else {
            container.innerHTML = keys.map(k => formatRow(cart[k])).join('');

            const subtotal = keys.reduce((s, k) => {
                return s + (parseFloat(cart[k].price) || 0) * (cart[k].qty || 0);
            }, 0);

            if (summaryEl) {
                summaryEl.innerHTML = `
                <div class="sticky-box">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div style="font-size:14px;color:var(--muted)">Items</div>
                        <div style="font-weight:700">${keys.length}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div style="font-size:16px;color:#111">Subtotal</div>
                        <div class="subtotal">${fmt(subtotal)}</div>
                    </div>
                    <div class="muted" style="font-size:13px">Shipping &amp; taxes calculated at checkout</div>
                </div>`;
            }
        }

        const totalQty = keys.reduce((s, k) => s + (cart[k].qty || 0), 0);
        if (toCheckout) {
            toCheckout.disabled = totalQty === 0;
            if (toCheckout.disabled) toCheckout.classList.add('btn-disabled');
            else toCheckout.classList.remove('btn-disabled');
            toCheckout.onclick = function () { if (!this.disabled) location.href = 'checkout.html'; };
        }

        if (window.refreshCartBadge) window.refreshCartBadge();
    }

    // ── Shared state ──────────────────────────────────────────────────────────
    // Keep a local copy of the cart in memory so +/- buttons work without re-fetching
    let currentCart = {};

    async function loadAndRender() {
        try {
            const data = await fetchCartFromServer();
            serverAvailable = true;
            currentCart = normaliseServerCart(data);
            // Keep localStorage in sync for checkout.js and cart-badge.js
            saveCartLocal(currentCart);
        } catch (e) {
            serverAvailable = false;
            currentCart = loadCartLocal();
        }
        renderCart(currentCart);
    }

    // ── Cart actions ──────────────────────────────────────────────────────────
    window.removeFromCart = async function (id) {
        if (serverAvailable) {
            try { await postCartToServer(id, 0); } catch (e) { serverAvailable = false; }
        }
        delete currentCart[id];
        saveCartLocal(currentCart);
        renderCart(currentCart);
        if (window.refreshCartBadge) window.refreshCartBadge();
    };

    window.increaseQty = async function (id) {
        if (!currentCart[id]) return;
        const newQty = (currentCart[id].qty || 0) + 1;
        if (serverAvailable) {
            try { await postCartToServer(id, newQty); } catch (e) { serverAvailable = false; }
        }
        currentCart[id].qty = newQty;
        saveCartLocal(currentCart);
        renderCart(currentCart);
        if (window.refreshCartBadge) window.refreshCartBadge();
    };

    window.decreaseQty = async function (id) {
        if (!currentCart[id]) return;
        const current = currentCart[id].qty || 0;
        const newQty  = current <= 1 ? 0 : current - 1;
        if (serverAvailable) {
            try { await postCartToServer(id, newQty); } catch (e) { serverAvailable = false; }
        }
        if (newQty <= 0) {
            delete currentCart[id];
        } else {
            currentCart[id].qty = newQty;
        }
        saveCartLocal(currentCart);
        renderCart(currentCart);
        if (window.refreshCartBadge) window.refreshCartBadge();
    };

    window.renderCart = () => renderCart(currentCart);
    window.addEventListener('tvCurrencyRatesReady', () => { try { renderCart(currentCart); } catch (e) {} });

    document.addEventListener('DOMContentLoaded', loadAndRender);
})();
