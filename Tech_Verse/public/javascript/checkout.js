// checkout.js
(function () {
    const CART_KEY = 'techverse_cart_v1';

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function loadCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch (e) { return {}; }
    }

    const items = loadCart();
    const keys  = Object.keys(items);

    const fmt = () => {
        if (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') {
            return window.tvCurrency.formatCurrency.bind(window.tvCurrency);
        }
        return v => '£' + Number(v).toFixed(2);
    };

    // ── Render cart items ────────────────────────────────────────────────────
    const container = document.getElementById('checkout-items');
    if (container) {
        if (!keys.length) {
            container.innerHTML = '<p class="muted">Your cart is empty.</p>';
        } else {
            container.innerHTML = keys.map(k => {
                const it  = items[k];
                const qty = Number(it.qty || 0);
                return `<div style="padding:8px;border:1px solid #eee;margin-bottom:8px;border-radius:6px">
                    <div style="font-weight:600">${it.name || it.id}</div>
                    <div>Qty: ${qty}</div>
                </div>`;
            }).join('');
        }
    }

    // ── Subtotal ──────────────────────────────────────────────────────────────
    let subtotal = keys.reduce((s, k) => {
        const num = parseFloat(String(items[k].price || '0').replace(/[^0-9.]/g, '')) || 0;
        return s + num * (Number(items[k].qty) || 0);
    }, 0);

    // ── Shipping ──────────────────────────────────────────────────────────────
    const shippingInputs = Array.from(document.querySelectorAll('input[name="shipping"]'));

    function getShippingCost() {
        const sel = shippingInputs.find(i => i.checked);
        return sel ? parseFloat(sel.dataset.cost || '0') : 0;
    }

    function refreshSummary() {
        const f    = fmt();
        const ship = getShippingCost();
        const sub  = document.getElementById('summary-subtotal');
        const sh   = document.getElementById('summary-shipping');
        const tot  = document.getElementById('summary-total');
        if (sub) sub.textContent = 'Subtotal: ' + f(subtotal);
        if (sh)  sh.textContent  = 'Shipping: ' + f(ship);
        if (tot) tot.textContent = 'Total: '    + f(subtotal + ship);
    }

    shippingInputs.forEach(i => i.addEventListener('change', refreshSummary));
    refreshSummary();
    window.addEventListener('tvCurrencyRatesReady', refreshSummary);

    // ── Place order ───────────────────────────────────────────────────────────
    const placeBtn  = document.getElementById('place-order');
    const resultEl  = document.getElementById('order-result');

    if (!placeBtn) return;

    placeBtn.addEventListener('click', async function () {
        if (placeBtn.disabled) return;
        if (!keys.length) {
            if (resultEl) { resultEl.style.color = '#d00'; resultEl.textContent = 'Your cart is empty.'; }
            return;
        }

        placeBtn.disabled = true;
        placeBtn.classList.add('btn-disabled');
        if (resultEl) { resultEl.style.color = '#666'; resultEl.textContent = 'Placing your order…'; }

        try {
            const res = await fetch('/api/checkout', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    items: keys.map(k => ({
                        variant_id: items[k].id,
                        quantity:   items[k].qty,
                    })),
                    shipping: getShippingCost(),
                    address: {
                        line1:    document.getElementById('address-line1')?.value.trim()  || '',
                        line2:    document.getElementById('address-line2')?.value.trim()  || '',
                        city:     document.getElementById('county')?.value.trim()         || '',
                        postcode: document.getElementById('postal-code')?.value.trim()    || '',
                        country:  document.getElementById('country-select')?.value.trim() || '',
                    },
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (resultEl) { resultEl.style.color = '#d00'; resultEl.textContent = data.message || 'Order failed. Please try again.'; }
                placeBtn.disabled = false;
                placeBtn.classList.remove('btn-disabled');
                return;
            }

            // ✅ Only clear cart AFTER server confirms the order
            localStorage.removeItem(CART_KEY);
            if (window.refreshCartBadge) window.refreshCartBadge();

            // Countdown redirect
            let secs = 5;
            const tick = () => {
                if (resultEl) resultEl.textContent = `Order placed! Redirecting in ${secs} second${secs === 1 ? '' : 's'}…`;
                if (secs-- <= 0) { clearInterval(id); location.href = 'index.html'; }
            };
            if (resultEl) { resultEl.style.color = 'green'; }
            tick();
            const id = setInterval(tick, 1000);

        } catch (e) {
            // Network error — do NOT clear cart
            if (resultEl) { resultEl.style.color = '#d00'; resultEl.textContent = 'Could not reach the server. Your cart has been kept.'; }
            placeBtn.disabled = false;
            placeBtn.classList.remove('btn-disabled');
        }
    });

})();
