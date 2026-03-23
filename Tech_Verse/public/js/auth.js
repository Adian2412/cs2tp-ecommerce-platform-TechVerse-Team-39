/*
  auth.js - Laravel version
  Checks auth state via /api/auth/me (server session)
  Signs out via /api/auth/logout
*/

(function () {
    function getApiBaseUrl() {
        try {
            const meta = document.querySelector('meta[name="tv-api-base"]');
            const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
            return raw ? raw.replace(/\/+$/, '') : '';
        } catch (e) {
            return '';
        }
    }

    window.getApiBaseUrl = window.getApiBaseUrl || getApiBaseUrl;
})();

document.addEventListener('DOMContentLoaded', async () => {
    const signinBtn    = document.getElementById('signin');
    const navMyAccount = document.getElementById('nav-myaccount');
    const navWishlist  = document.getElementById('nav-wishlist');
    const navCheckout  = document.getElementById('nav-checkout');
    const navFav       = document.getElementById('nav-fav');
    const navCart      = document.getElementById('nav-cart');
    const navUser      = document.getElementById('nav-user');
    const navAdmin     = document.getElementById('nav-admin');
    const API_BASE     = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '';

    function apiUrl(path) {
        if (API_BASE) return API_BASE + path;
        return path;
    }

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function setLoggedInUI(isLoggedIn, currentUser = null) {
        const show = el => { if (el) el.style.display = ''; };
        const hide = el => { if (el) el.style.display = 'none'; };

        if (isLoggedIn) {
            show(navMyAccount);
            show(navWishlist);
            show(navCheckout);
            show(navFav);
            show(navUser);
            show(navCart);
            if (currentUser && currentUser.role === 'admin') show(navAdmin);
            else hide(navAdmin);
        } else {
            hide(navMyAccount);
            hide(navWishlist);
            hide(navCheckout);
            hide(navFav);
            hide(navUser);
            hide(navAdmin);
            show(navCart);
        }
    }

    setLoggedInUI(false);
    if (!signinBtn) return;

    let currentUser = null;
    try {
        const res = await fetch(apiUrl('/api/auth/me'), {
            method: 'POST',
            credentials: API_BASE ? 'include' : 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
            },
        });

        if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
                currentUser = data.user;
            }
        }
    } catch (err) {
        console.warn('Auth check failed:', err);
    }

    if (currentUser) {
        try { localStorage.setItem('techverse_auth_user', JSON.stringify(currentUser)); } catch (e) {}
        signinBtn.textContent = currentUser.name || 'Account';
        signinBtn.disabled = true;
        signinBtn.style.cssText = 'background:none;border:none;color:inherit;cursor:default;font:inherit;padding:0';
        setLoggedInUI(true, currentUser);

        const isAccountPage = /account\.html/i.test(location.pathname);
        if (!isAccountPage && signinBtn.parentElement) {
            const parent = signinBtn.parentElement;
            if (!parent.querySelector('.header-signout')) {
                const outBtn = document.createElement('button');
                outBtn.className = 'btn-ghost header-signout';
                outBtn.textContent = 'Sign Out';
                outBtn.addEventListener('click', async () => {
                    try {
                        await fetch(apiUrl('/api/auth/logout'), {
                            method: 'POST',
                            credentials: API_BASE ? 'include' : 'same-origin',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                            },
                        });
                    } catch (e) {}
                    localStorage.removeItem('techverse_auth_user');
                    localStorage.removeItem('techverse_session_token');
                    location.href = 'index.html';
                });
                parent.appendChild(outBtn);
            }
        }
    } else {
        localStorage.removeItem('techverse_auth_user');
        signinBtn.textContent = 'Sign In';
        signinBtn.disabled = false;
        signinBtn.style.cssText = '';
        signinBtn.onclick = () => { location.href = 'signin.html'; };
    }
});
