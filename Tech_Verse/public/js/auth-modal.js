/*
  auth-modal.js
  Prompts unauthenticated users to sign in before checkout.
  Auth check uses POST /api/auth/me (server session) — not localStorage.
  No iframe, no reference to /login (which doesn't exist as a web route).
*/
(function () {

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    async function isLoggedIn() {
        try {
            const res = await fetch('/api/auth/me', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });
            if (!res.ok) return false;
            const data = await res.json();
            return !!(data.authenticated && data.user);
        } catch (e) {
            return false;
        }
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'tv-auth-overlay';
        overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';

        const box = document.createElement('div');
        box.style.cssText = 'width:400px;max-width:94%;background:#fff;padding:28px 24px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.2);position:relative';

        // Close X
        const closeX = document.createElement('button');
        closeX.innerHTML = '&times;';
        closeX.setAttribute('aria-label', 'Close');
        closeX.style.cssText = 'position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:24px;cursor:pointer;line-height:1;color:#666;padding:0';
        closeX.addEventListener('click', removeModal);

        const title = document.createElement('h3');
        title.textContent = 'Sign in to continue';
        title.style.marginTop = '0';

        const info = document.createElement('p');
        info.style.cssText = 'color:#6b7280;font-size:14px;margin-bottom:20px';
        info.textContent = 'You need to be signed in to proceed to checkout.';

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;flex-direction:column;gap:10px';

        const signinBtn = document.createElement('button');
        signinBtn.className = 'btn-primary';
        signinBtn.textContent = 'Sign In';
        signinBtn.style.width = '100%';
        signinBtn.addEventListener('click', () => { location.href = 'signin.html'; });

        const guestBtn = document.createElement('button');
        guestBtn.className = 'btn-ghost';
        guestBtn.textContent = 'Continue as guest';
        guestBtn.style.width = '100%';
        guestBtn.addEventListener('click', () => { removeModal(); location.assign('checkout.html'); });

        actions.appendChild(signinBtn);
        actions.appendChild(guestBtn);

        box.appendChild(closeX);
        box.appendChild(title);
        box.appendChild(info);
        box.appendChild(actions);
        overlay.appendChild(box);

        overlay.addEventListener('click', e => { if (e.target === overlay) removeModal(); });

        function removeModal() {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        return overlay;
    }

    function showAuthModal() {
        // Remove any existing modal first
        const existing = document.getElementById('tv-auth-overlay');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        document.body.appendChild(createModal());
    }

    function attachAuthModalToCheckout(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener('click', async function (ev) {
            if (btn.disabled) return;
            ev.preventDefault();
            ev.stopImmediatePropagation && ev.stopImmediatePropagation();

            const loggedIn = await isLoggedIn();
            if (loggedIn) {
                location.assign('checkout.html');
            } else {
                showAuthModal();
            }
        }, true);
    }

    window.tvAuthModal = { showAuthModal, attachAuthModalToCheckout };

})();
