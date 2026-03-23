// cart-badge.js — syncs cart count badge from server when available, localStorage otherwise
(function () {
    const CART_KEY = 'techverse_cart_v1';

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function localCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
            return Object.values(cart).reduce((s, it) => s + (it.qty || 0), 0);
        } catch (e) { return 0; }
    }

    function applyCount(count) {
        const els = document.querySelectorAll('#cart-count');
        els.forEach(el => {
            if (count > 0) { el.textContent = String(count); el.style.display = ''; }
            else           { el.textContent = ''; el.style.display = 'none'; }
        });
        const navCart = document.getElementById('nav-cart');
        if (navCart) {
            if (count > 0) navCart.classList.add('has-items');
            else           navCart.classList.remove('has-items');
        }
    }

    async function refreshCartBadge() {
        // Try server first
        try {
            const res = await fetch('/api/cart', {
                credentials: 'include',
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
            if (res.ok) {
                const data  = await res.json();
                const items = data.items || data.data || (Array.isArray(data) ? data : []);
                const count = items.reduce((s, it) => s + (it.quantity || 0), 0);
                // Keep localStorage in sync
                applyCount(count);
                return count;
            }
        } catch (e) { /* fall through to localStorage */ }

        // Fallback
        const count = localCartCount();
        applyCount(count);
        return count;
    }

    window.refreshCartBadge = refreshCartBadge;

    document.addEventListener('DOMContentLoaded', refreshCartBadge);

    // Cross-tab update when localStorage changes (fallback mode)
    window.addEventListener('storage', e => { if (e.key === CART_KEY) refreshCartBadge(); });

})();
