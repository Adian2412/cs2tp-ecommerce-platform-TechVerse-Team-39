/*
  auth.js - Laravel version
  Checks auth state via POST /api/auth/me (server session)
  Signs out via POST /api/auth/logout
  XSS: all DOM writes use textContent / createElement
*/

document.addEventListener('DOMContentLoaded', async () => {
    const signinBtn    = document.getElementById('signin');
    const navMyAccount = document.getElementById('nav-myaccount');
    const navWishlist  = document.getElementById('nav-wishlist');
    const navCheckout  = document.getElementById('nav-checkout');
    const navFav       = document.getElementById('nav-fav');
    const navCart      = document.getElementById('nav-cart');
    const navUser      = document.getElementById('nav-user');

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function setLoggedInUI(isLoggedIn) {
        const show = el => { if (el) el.style.display = ''; };
        const hide = el => { if (el) el.style.display = 'none'; };

        if (isLoggedIn) {
            show(navMyAccount);
            show(navWishlist);
            show(navCheckout);
            show(navFav);
            show(navUser);
            hide(navCart);
        } else {
            hide(navMyAccount);
            hide(navWishlist);
            hide(navCheckout);
            hide(navFav);
            hide(navUser);
            show(navCart);
        }
    }

    // Default to logged out state
    setLoggedInUI(false);
    if (!signinBtn) return;

    // Check server session
    let currentUser = null;
    try {
        const res = await fetch('/api/auth/me', {
            method:      'POST',
            credentials: 'include',
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
        // Show name as plain text - strip button styles so it doesn't look clickable
        signinBtn.textContent = currentUser.name || 'Account';
        signinBtn.disabled    = true;
        signinBtn.style.cssText = 'background:none;border:none;color:inherit;cursor:default;font:inherit;padding:0';
        setLoggedInUI(true);

        // Add sign out button on all pages except account page
        const isAccountPage = /account\.html/i.test(location.pathname);
        if (!isAccountPage && signinBtn.parentElement) {
            const parent = signinBtn.parentElement;
            if (!parent.querySelector('.header-signout')) {
                const outBtn = document.createElement('button');
                outBtn.className   = 'btn-ghost header-signout';
                outBtn.textContent = 'Sign Out';
                outBtn.addEventListener('click', async () => {
                    try {
                        await fetch('/api/auth/logout', {
                            method:      'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                            },
                        });
                    } catch (e) {}
                    sessionStorage.removeItem('tv_ui_user');
                    location.href = 'index.html';
                });
                parent.appendChild(outBtn);
            }
        }
    } else {
        signinBtn.textContent = 'Sign In';
        signinBtn.disabled    = false;
        signinBtn.style.cssText = '';
        signinBtn.onclick     = () => { location.href = 'signin.html'; };
    }
});
